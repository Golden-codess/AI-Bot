# ============================================================================
# bot.py
# Premium darajadagi, asinxron, ko'p foydalanuvchiga bir vaqtda xizmat
# ko'rsata oladigan Telegram AI Bot.
# Ikkita sun'iy intellekt provayderi qo'llab-quvvatlanadi: Google Gemini va Groq (Llama 3).
# Loyiha Hugging Face Spaces (Docker) muhitida 24/7 ishlashga moslashtirilgan.
# ============================================================================

import os               # Operatsion tizim muhit o'zgaruvchilarini (Secrets) o'qish uchun
import re                # MarkdownV2 belgilarini "escape" qilish uchun regulyar ifodalar
import asyncio           # Asinxron (parallel) dasturlash uchun asosiy kutubxona
import logging           # Bot ishlashi davomida loglarni (xabarlarni) konsolga chiqarish uchun

# --- aiogram (Telegram Bot API) uchun kerakli importlar ---
from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode, ChatAction
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)
from aiogram.utils.chat_action import ChatActionSender
from aiogram.exceptions import TelegramBadRequest

# --- Sun'iy intellekt provayderlari uchun kerakli importlar ---
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPICallError

from groq import AsyncGroq
from groq import RateLimitError as GroqRateLimitError
from groq import APIError as GroqAPIError

# --- Hugging Face uchun mini "health-check" veb-server importlari ---
from aiohttp import web


# ============================================================================
# 1-QISM: LOGLASH VA MUHIT O'ZGARUVCHILARI (SECRETS) SOZLAMALARI
# ============================================================================

# Loglash tizimini sozlaymiz - bu konteyner loglarida nima bo'layotganini ko'rish uchun kerak.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("ai_telegram_bot")

# MUHIM: Hech qanday maxfiy kalit kod ichida to'g'ridan-to'g'ri yozilmaydi!
# Barcha kalitlar Hugging Face Space sozlamalaridagi "Settings -> Variables and secrets"
# bo'limidan os.getenv() funksiyasi orqali xavfsiz tarzda o'qib olinadi.
BOT_TOKEN = os.getenv("BOT_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Agar asosiy token mavjud bo'lmasa, bot ishga tushishidan oldin aniq xatolik bilan to'xtaymiz.
# Bu xatoni keyinchalik qidirib yurishdan ko'ra, darhol sababini bilish uchun foydali.
if not BOT_TOKEN:
    raise RuntimeError(
        "❌ BOT_TOKEN topilmadi! Hugging Face Space 'Secrets' bo'limiga BOT_TOKEN qiymatini kiriting."
    )

# Gemini API mijozini sozlaymiz (agar kalit mavjud bo'lsa).
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")
else:
    gemini_model = None
    logger.warning("⚠️ GEMINI_API_KEY topilmadi - Gemini funksiyasi ishlamaydi.")

# Groq API mijozini sozlaymiz (agar kalit mavjud bo'lsa). AsyncGroq - to'liq asinxron klient.
groq_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
if not groq_client:
    logger.warning("⚠️ GROQ_API_KEY topilmadi - Groq (Llama 3) funksiyasi ishlamaydi.")

# Groq Cloud'dagi Llama 3 modelining nomi (eng barqaror va tezkor versiyalardan biri).
GROQ_MODEL_NAME = "llama3-70b-8192"


# ============================================================================
# 2-QISM: BOT VA DISPATCHER OBYEKTLARINI YARATISH
# ============================================================================

# Bot obyektini yaratamiz. DefaultBotProperties orqali barcha xabarlar
# standart bo'yicha MarkdownV2 formatida yuborilishini belgilaymiz.
bot = Bot(
    token=BOT_TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN_V2),
)

# Dispatcher - kelayotgan barcha xabar va tugma bosishlarni (callback) qabul qiluvchi "yo'naltiruvchi".
dp = Dispatcher()

# Har bir foydalanuvchi qaysi AI modelini tanlaganini xotirada saqlash uchun lug'at (dictionary).
# Kalit: foydalanuvchi ID'si (int), Qiymat: "gemini" yoki "groq" (str).
# Eslatma: bu - oddiy "in-memory" xotira, konteyner qayta ishga tushsa tozalanadi.
# Production'da kattaroq loyihalarda buning o'rniga Redis kabi tashqi xotiradan foydalanish tavsiya etiladi.
user_active_model: dict[int, str] = {}

# Bot eski xabarlarning ID'sini ham vaqtincha saqlashi mumkin (kerak bo'lganda kengaytirish uchun joy).


# ============================================================================
# 3-QISM: YORDAMCHI (UTILITY) FUNKSIYALAR
# ============================================================================

def escape_markdown_v2(text: str) -> str:
    """
    Sun'iy intellektdan kelgan "tabiiy" matnni Telegram MarkdownV2 standartiga
    moslab, xavfsiz tarzda eskeyplaydi (escape qiladi).

    AI modellari ko'pincha **qalin** (ikki yulduzcha) formatidan foydalanadi,
    lekin Telegram MarkdownV2 faqat *bitta* yulduzchani "qalin" deb tushunadi.
    Shu sababli avval formatni moslashtiramiz, so'ngra qolgan barcha
    "rezerv qilingan" belgilarni backslash (\\) bilan ekranlaymiz.
    """

    # --- 1-QADAM: Kod bloklarini (``` ... ```) vaqtincha "qalqon" ortiga yashiramiz ---
    # Chunki kod ichidagi belgilarni (masalan, nuqta, tire) escape qilish kodni buzib qo'yadi.
    code_blocks: list[str] = []

    def _stash_code_block(match: re.Match) -> str:
        code_blocks.append(match.group(0))
        return f"\x00CODEBLOCK{len(code_blocks) - 1}\x00"

    text = re.sub(r"```[\s\S]*?```", _stash_code_block, text)

    # --- 2-QADAM: Bitta qatordagi inline kodlarni (`kod`) ham vaqtincha yashiramiz ---
    inline_codes: list[str] = []

    def _stash_inline_code(match: re.Match) -> str:
        inline_codes.append(match.group(0))
        return f"\x00INLINE{len(inline_codes) - 1}\x00"

    text = re.sub(r"`[^`\n]+?`", _stash_inline_code, text)

    # --- 3-QADAM: **qalin** formatini Telegram tushunadigan *qalin* formatiga o'tkazamiz ---
    text = re.sub(r"\*\*(.+?)\*\*", r"*\1*", text)

    # --- 4-QADAM: Telegram MarkdownV2'ning rasmiy "rezerv qilingan" belgilari ---
    # Eslatma: yulduzcha (*) atayin ro'yxatga kiritilmagan, chunki uni "qalin" matn
    # uchun formatlash belgisi sifatida ataylab ishlatamiz.
    reserved_chars = r"_[]()~>#+-=|{}.!"

    escaped_parts = []
    for char in text:
        if char in reserved_chars:
            escaped_parts.append("\\" + char)
        else:
            escaped_parts.append(char)
    text = "".join(escaped_parts)

    # --- 5-QADAM: Yashirilgan kod bloklarini va inline kodlarni joyiga qaytaramiz ---
    for i, block in enumerate(code_blocks):
        text = text.replace(f"\x00CODEBLOCK{i}\x00", block)
    for i, code in enumerate(inline_codes):
        text = text.replace(f"\x00INLINE{i}\x00", code)

    return text


def split_text_into_chunks(text: str, max_length: int = 4096) -> list[str]:
    """
    Telegram bitta xabarda 4096 belgidan ortiq matnni qabul qilmaydi.
    Bu funksiya uzun matnni so'zlarni va qatorlarni buzmagan holda,
    xavfsiz bo'laklarga (chunklarga) bo'lib beradi.
    """
    if len(text) <= max_length:
        return [text]

    # Avval matnni qator (\n) chegaralari bo'yicha bo'lamiz - bu kod va paragraflarni saqlab qoladi.
    chunks: list[str] = []
    current_chunk = ""

    for line in text.split("\n"):
        # Agar joriy bo'lakka shu qatorni qo'shsak, limitdan oshib ketadigan bo'lsa,
        # joriy bo'lakni yakunlab, yangisini boshlaymiz.
        if len(current_chunk) + len(line) + 1 > max_length:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = line
        else:
            current_chunk = f"{current_chunk}\n{line}" if current_chunk else line

    if current_chunk:
        chunks.append(current_chunk)

    # Ehtiyot chorasi: agar bironta qatorning o'zi 4096 belgidan uzun bo'lsa
    # (juda kamdan-kam holat), uni so'zlar bo'yicha qo'shimcha bo'lamiz.
    final_chunks: list[str] = []
    for chunk in chunks:
        if len(chunk) <= max_length:
            final_chunks.append(chunk)
        else:
            words = chunk.split(" ")
            sub_chunk = ""
            for word in words:
                if len(sub_chunk) + len(word) + 1 > max_length:
                    final_chunks.append(sub_chunk)
                    sub_chunk = word
                else:
                    sub_chunk = f"{sub_chunk} {word}" if sub_chunk else word
            if sub_chunk:
                final_chunks.append(sub_chunk)

    return final_chunks


def get_main_keyboard(active_model: str) -> InlineKeyboardMarkup:
    """
    Foydalanuvchining hozirgi tanlagan modeliga qarab, dinamik ravishda
    pastki tugmalar (inline keyboard) matritsasini yasaydi.
    Faol model yonida 🟢/⚪ emoji avtomatik almashinadi.
    """
    gemini_label = "🟢 Google Gemini" if active_model == "gemini" else "⚪ Google Gemini"
    groq_label = "🟢 Groq Llama" if active_model == "groq" else "⚪ Groq Llama"

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=gemini_label, callback_data="model:gemini"),
                InlineKeyboardButton(text=groq_label, callback_data="model:groq"),
            ],
            [
                InlineKeyboardButton(text="ℹ️ Loyiha Haqida", callback_data="menu:about"),
                InlineKeyboardButton(text="🛠 Yordam", callback_data="menu:help"),
            ],
        ]
    )
    return keyboard


def get_back_keyboard() -> InlineKeyboardMarkup:
    """"Loyiha haqida" va "Yordam" ekranlarida bosh menyuga qaytish uchun tugma yasaydi."""
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="⬅️ Orqaga", callback_data="menu:main")]]
    )


def get_user_model(user_id: int) -> str:
    """Foydalanuvchining tanlagan AI modelini qaytaradi. Standart holatda - Gemini."""
    return user_active_model.get(user_id, "gemini")


# ============================================================================
# 4-QISM: SUN'IY INTELLEKT PROVAYDERLARI BILAN ASINXRON ISHLASH
# ============================================================================

class AIRequestError(Exception):
    """AI'dan javob olishda umumiy xatolik yuz berganda ishlatiladigan maxsus istisno (exception)."""
    pass


class AIRateLimitError(AIRequestError):
    """Aynan "so'rovlar soni limiti" (429 xatoligi) yuz berganda ishlatiladigan maxsus istisno."""
    pass


async def ask_gemini(prompt: str) -> str:
    """
    Google Gemini 1.5 Flash modeliga so'rov yuboradi.
    google-generativeai kutubxonasi SINXRON (sync) ishlaydi, shuning uchun uni
    asyncio.to_thread() yordamida alohida "thread"da ishga tushiramiz - bu butun
    botning "qotib qolishini" (blocking) oldini oladi va parallel ishlashni ta'minlaydi.
    """
    if gemini_model is None:
        raise AIRequestError("Gemini modeli sozlanmagan (API kalit topilmadi).")

    try:
        response = await asyncio.to_thread(gemini_model.generate_content, prompt)
        return response.text
    except ResourceExhausted as exc:
        # Bu xatolik aynan "so'rovlar limiti tugadi" (429) holatiga to'g'ri keladi.
        raise AIRateLimitError("Gemini API so'rovlar limiti tugadi.") from exc
    except GoogleAPICallError as exc:
        raise AIRequestError(f"Gemini API xatoligi: {exc}") from exc


async def ask_groq(prompt: str) -> str:
    """
    Groq Cloud orqali Llama 3 modeliga so'rov yuboradi.
    AsyncGroq klienti tabiiy ravishda asinxron bo'lgani uchun to'g'ridan-to'g'ri "await" qilamiz.
    """
    if groq_client is None:
        raise AIRequestError("Groq modeli sozlanmagan (API kalit topilmadi).")

    try:
        completion = await groq_client.chat.completions.create(
            model=GROQ_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2048,
        )
        return completion.choices[0].message.content
    except GroqRateLimitError as exc:
        raise AIRateLimitError("Groq API so'rovlar limiti tugadi.") from exc
    except GroqAPIError as exc:
        raise AIRequestError(f"Groq API xatoligi: {exc}") from exc


async def get_ai_response(prompt: str, model_choice: str) -> str:
    """Foydalanuvchi tanlagan modelga qarab tegishli AI funksiyasini chaqiradi."""
    if model_choice == "groq":
        return await ask_groq(prompt)
    return await ask_gemini(prompt)


# ============================================================================
# 5-QISM: STATIK MATNLAR (MENYU EKRANLARI)
# Eslatma: bu matnlar MarkdownV2 uchun MUTLAQO QO'L BILAN to'g'ri eskeyplangan,
# chunki ular AI javobi emas, balki botning o'z statik matnlari.
# ============================================================================

WELCOME_TEXT = (
    "🤖 *AI Yordamchi Botga xush kelibsiz\\!*\n\n"
    "Men sizga ikkita kuchli sun'iy intellekt orqali yordam beraman:\n"
    "🟢 *Google Gemini* — chuqur tahlil va ijodiy javoblar uchun\\.\n"
    "⚪ *Groq Llama 3* — chaqmoqdek tezkor javoblar uchun\\.\n\n"
    "Pastdagi tugmalar orqali kerakli AI modelini tanlang va menga "
    "istalgan savolingizni oddiy matn ko'rinishida yozing 👇"
)

ABOUT_TEXT = (
    "ℹ️ *Loyiha haqida*\n\n"
    "Bu bot to'liq asinxron arxitekturada \\(`aiogram v3` \\+ `asyncio`\\) qurilgan "
    "va bir vaqtning o'zida o'nlab foydalanuvchiga parallel xizmat ko'rsata oladi\\.\n\n"
    "Ishlatilgan texnologiyalar:\n"
    "• `Python 3\\.10`\n"
    "• `aiogram 3\\.x` — Telegram Bot API\n"
    "• `Google Gemini 1\\.5 Flash`\n"
    "• `Groq Cloud \\+ Llama 3`\n"
    "• `Hugging Face Spaces \\(Docker\\)` — 24/7 bepul hosting"
)

HELP_TEXT = (
    "🛠 *Yordam bo'limi*\n\n"
    "1\\. Yuqoridagi tugmalar orqali AI modelini tanlang \\(🟢 \\- faol model\\)\\.\n"
    "2\\. Menga oddiy matn ko'rinishida istalgan savolingizni yozing\\.\n"
    "3\\. Bot javobni tayyorlash jarayonini jonli animatsiya bilan ko'rsatadi\\.\n"
    "4\\. Agar javob juda uzun bo'lsa, u bir necha xabarga avtomatik bo'linib yuboriladi\\.\n\n"
    "Savol yoki taklif bo'lsa, loyiha egasiga murojaat qiling\\."
)

LOADING_TEXT = "🔍 *Sun'iy intellekt so'rovingizni tahlil qilmoqda\\.\\.\\.* ⏳"
FORMING_ANSWER_TEXT = "🧠 *Javob shakllantirilmoqda\\.\\.\\.* 🚀"
RATE_LIMIT_TEXT = (
    "🔄 *Tizim vaqtincha band\\.\\.\\.* Iltimos, bir ozdan so'ng qayta urinib ko'ring\\."
)
GENERIC_ERROR_TEXT = (
    "⚠️ *Kutilmagan xatolik yuz berdi\\.* Iltimos, biroz kutib qaytadan urinib ko'ring\\."
)


# ============================================================================
# 6-QISM: BUYRUQ (COMMAND) VA XABAR HANDLERLARI
# ============================================================================

@dp.message(CommandStart())
async def handle_start(message: Message) -> None:
    """Foydalanuvchi /start buyrug'ini yuborganda ishga tushadi - asosiy menyuni ko'rsatadi."""
    active_model = get_user_model(message.from_user.id)
    await message.answer(WELCOME_TEXT, reply_markup=get_main_keyboard(active_model))


@dp.message(Command("help"))
async def handle_help_command(message: Message) -> None:
    """/help buyrug'i orqali ham yordam matnini ko'rsatish imkonini beradi."""
    await message.answer(HELP_TEXT, reply_markup=get_back_keyboard())


# --- TUGMALAR (CALLBACK QUERY) BILAN ISHLASH ---

@dp.callback_query(F.data.startswith("model:"))
async def handle_model_selection(callback: CallbackQuery) -> None:
    """
    Foydalanuvchi "Gemini" yoki "Groq" tugmasini bosganda ishga tushadi.
    Tanlovni xotirada saqlaydi va tugmalardagi 🟢/⚪ emojilarni darhol yangilaydi.
    """
    chosen_model = callback.data.split(":")[1]  # "gemini" yoki "groq"
    user_active_model[callback.from_user.id] = chosen_model

    try:
        # Xabarni QAYTA YUBORMASDAN, mavjud xabarning tugmalarini joyida (edit) yangilaymiz.
        await callback.message.edit_reply_markup(reply_markup=get_main_keyboard(chosen_model))
    except TelegramBadRequest:
        # Agar tugmalar allaqachon shu holatda bo'lsa, Telegram xato qaytaradi - buni e'tiborsiz qoldiramiz.
        pass

    model_display_name = "Google Gemini 🟢" if chosen_model == "gemini" else "Groq Llama 3 🟢"
    await callback.answer(f"Tanlandi: {model_display_name}")


@dp.callback_query(F.data == "menu:about")
async def handle_about_menu(callback: CallbackQuery) -> None:
    """"Loyiha Haqida" tugmasi bosilganda mavjud xabarni shu matn bilan asinxron almashtiradi."""
    await callback.message.edit_text(ABOUT_TEXT, reply_markup=get_back_keyboard())
    await callback.answer()


@dp.callback_query(F.data == "menu:help")
async def handle_help_menu(callback: CallbackQuery) -> None:
    """"Yordam" tugmasi bosilganda mavjud xabarni yordam matni bilan asinxron almashtiradi."""
    await callback.message.edit_text(HELP_TEXT, reply_markup=get_back_keyboard())
    await callback.answer()


@dp.callback_query(F.data == "menu:main")
async def handle_back_to_main(callback: CallbackQuery) -> None:
    """"Orqaga" tugmasi bosilganda foydalanuvchini asosiy menyuga qaytaradi."""
    active_model = get_user_model(callback.from_user.id)
    await callback.message.edit_text(WELCOME_TEXT, reply_markup=get_main_keyboard(active_model))
    await callback.answer()


# --- ASOSIY MATNLI XABARLARNI QABUL QILISH VA AI'GA YO'NALTIRISH ---

@dp.message(F.text)
async def handle_user_question(message: Message) -> None:
    """
    Foydalanuvchidan oddiy matnli savol kelganda ishga tushadigan ASOSIY handler.
    To'liq jarayon: 1) Loading xabarini chiqarish -> 2) "typing..." animatsiyasini yoqish ->
    3) AI'dan parallel javob olish -> 4) Javobni formatlab, kerak bo'lsa bo'laklarga bo'lib yuborish.
    """
    user_id = message.from_user.id
    active_model = get_user_model(user_id)
    user_prompt = message.text

    # 1-QADAM: Darhol vaqtinchalik "yuklanmoqda" xabarini yuboramiz.
    loading_message = await message.answer(LOADING_TEXT)

    try:
        # 2-QADAM: Fonda "yozayotgan..." pulsatsiyasini yoqib qo'yamiz va shu paytda
        # AI'dan javob kutamiz. ChatActionSender avtomatik tarzda har 4-5 soniyada
        # "typing" statusini Telegram'ga qayta yuborib turadi, toki javob tayyor bo'lguncha.
        async with ChatActionSender(
            bot=bot,
            chat_id=message.chat.id,
            action=ChatAction.TYPING,
        ):
            # AI javobni shakllantirayotganini bildirish uchun loading matnini yangilaymiz.
            try:
                await loading_message.edit_text(FORMING_ANSWER_TEXT)
            except TelegramBadRequest:
                pass

            # 3-QADAM: Tanlangan AI modelidan ASINXRON javob olamiz.
            # Bu chaqiruv boshqa foydalanuvchilarning so'rovlarini bloklamaydi -
            # aiogram va asyncio bir vaqtning o'zida bir nechta shu funksiyani parallel ishga tushiraveradi.
            raw_answer = await get_ai_response(user_prompt, active_model)

        # 4-QADAM: AI javobini Telegram uchun xavfsiz MarkdownV2 formatiga o'giramiz.
        safe_answer = escape_markdown_v2(raw_answer)

        # 5-QADAM: Javobni 4096 belgilik xavfsiz bo'laklarga bo'lamiz (agar kerak bo'lsa).
        chunks = split_text_into_chunks(safe_answer)

        # Birinchi bo'lakni eski "loading" xabarining O'RNIGA tahrirlaymiz (edit_text) -
        # bu foydalanuvchiga silliq va tez tuyuladigan tajriba beradi.
        await loading_message.edit_text(chunks[0])

        # Agar javob bir nechta bo'lakdan iborat bo'lsa, qolganlarini ketma-ket yangi xabar sifatida yuboramiz.
        for chunk in chunks[1:]:
            await message.answer(chunk)

    except AIRateLimitError:
        # Maxsus holat: aynan "so'rovlar limiti" (429) xatoligi yuz berganda.
        try:
            await loading_message.edit_text(RATE_LIMIT_TEXT)
        except TelegramBadRequest:
            await message.answer(RATE_LIMIT_TEXT)

    except Exception as exc:  # noqa: BLE001 - bot hech qachon shu yerda "qotib qolmasligi" kerak
        # Har qanday boshqa kutilmagan xatolik (tarmoq uzilishi va h.k.) shu yerda ushlanadi,
        # bot crash bo'lib qolmaydi, foydalanuvchiga esa chiroyli xabar ko'rsatiladi.
        logger.exception("Foydalanuvchi so'roviga javob berishda xatolik: %s", exc)
        try:
            await loading_message.edit_text(GENERIC_ERROR_TEXT)
        except TelegramBadRequest:
            await message.answer(GENERIC_ERROR_TEXT)


# ============================================================================
# 7-QISM: HUGGING FACE SPACES UCHUN MINI "HEALTH-CHECK" VEB-SERVERI
# Hugging Face Docker Space'lari konteynerning biror portni (odatda 7860)
# tinglashini kutadi, aks holda Space holati noaniq bo'lib qolishi mumkin.
# Shuning uchun botning asosiy "polling" jarayoni bilan PARALLEL ravishda
# juda kichik bir veb-server ham ishga tushiramiz.
# ============================================================================

async def health_check_handler(request: web.Request) -> web.Response:
    """Hugging Face yoki boshqa monitoring xizmatlari uchun oddiy "bot ishlayapti" javobi."""
    return web.Response(text="✅ AI Telegram Bot ishga tushirilgan va faol holatda ishlamoqda.")


async def start_health_check_server() -> None:
    """7860-portda mini aiohttp veb-serverini ishga tushiradi."""
    app = web.Application()
    app.router.add_get("/", health_check_handler)

    runner = web.AppRunner(app)
    await runner.setup()

    port = int(os.getenv("PORT", 7860))
    site = web.TCPSite(runner, host="0.0.0.0", port=port)
    await site.start()
    logger.info("🌐 Health-check veb-server %s-portda ishga tushdi.", port)


# ============================================================================
# 8-QISM: BOTNI ISHGA TUSHIRISH (ENTRY POINT)
# ============================================================================

async def main() -> None:
    """
    Botning bosh funksiyasi.
    Ikki jarayonni PARALLEL ravishda ishga tushiradi:
    1) Telegram'dan kelayotgan xabarlarni "polling" rejimida tinglash.
    2) Hugging Face uchun mini health-check veb-serverini ishlatish.
    """
    logger.info("🚀 Bot ishga tushirilmoqda...")

    # Eski "webhook" sozlamalari bo'lsa, ularni tozalaymiz - bu polling rejimi
    # to'g'ri ishlashi va eski navbatda qolgan xabarlar yuborilib ketishi uchun zarur.
    await bot.delete_webhook(drop_pending_updates=True)

    # asyncio.gather() ikkita asinxron vazifani BIR VAQTDA, parallel tarzda ishga tushiradi.
    await asyncio.gather(
        dp.start_polling(bot),
        start_health_check_server(),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("🛑 Bot to'xtatildi.")

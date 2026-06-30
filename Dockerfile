# ============================================================
# Dockerfile
# Hugging Face Spaces "Docker (Blank)" shabloni uchun mo'ljallangan.
# Maqsad: eng yengil, xavfsiz va tez yig'iladigan (build) konteyner yaratish.
# ============================================================

# Asos sifatida eng yengil va xavfsiz rasmiy Python obrazini olamiz.
# "slim" versiyasi keraksiz tizim paketlarini o'z ichiga olmaydi,
# shuning uchun u yengil va tezroq yuklanadi.
FROM python:3.10-slim

# Konteyner ichidagi muhit o'zgaruvchilarini sozlaymiz.
# PYTHONUNBUFFERED=1 -> Python konsol chiqishlarini (print, log) buferlamasdan
# darhol chiqarishini ta'minlaydi. Bu Hugging Face loglarini real vaqtda kuzatish uchun muhim.
# PYTHONDONTWRITEBYTECODE=1 -> .pyc fayllarini yaratmaydi, konteynerni yengillashtiradi.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Konteyner ichida ishchi katalog (working directory) yaratamiz.
WORKDIR /app

# Avval FAQAT requirements.txt faylini ko'chiramiz.
# Bu Docker "layer caching" mexanizmidan foydalanish uchun muhim qadam:
# agar faqat bot.py o'zgarsa, kutubxonalar qayta o'rnatilmaydi va build tezlashadi.
COPY requirements.txt .

# Kerakli barcha kutubxonalarni o'rnatamiz.
# --no-cache-dir -> pip keshini saqlamaydi, bu konteyner hajmini kichraytiradi.
RUN pip install --no-cache-dir -r requirements.txt

# Loyihaning qolgan barcha fayllarini (bot.py) konteyner ichiga ko'chiramiz.
COPY . .

# Hugging Face Spaces "Docker" turi konteynerning 7860-portini tinglashini kutadi
# (health-check va Space holatini "Running" deb belgilash uchun).
# Shuning uchun bot.py ichida shu portda mini veb-server ham ishga tushadi.
EXPOSE 7860

# Xavfsizlik yuzasidan botni "root" emas, oddiy foydalanuvchi nomidan ishlatamiz.
RUN useradd --create-home --shell /bin/bash botuser
USER botuser

# Konteyner ishga tushganda bajariladigan asosiy buyruq - botni ishga tushiramiz.
CMD ["python", "bot.py"]

# Publicar la página en GitHub Pages

1. En GitHub, crea un repositorio nuevo (por ejemplo `alone-reportes-whatsapp`), vacío, sin README.
2. En esta carpeta (`reportes-alone-whatsapp`), conecta el repo remoto y sube todo:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/alone-reportes-whatsapp.git
   git branch -M main
   git push -u origin main
   ```
3. En GitHub, ve a `Settings > Pages`.
4. En "Build and deployment", elige `Deploy from a branch`, rama `main`, carpeta `/ (root)` — GitHub Pages solo permite servir desde la raíz del repositorio o desde una carpeta llamada `/docs`, por eso los archivos de la página (`index.html`, `assets/`, `lib/`) viven en la raíz del proyecto y no dentro de una carpeta `web/`.
5. Guarda y espera 1-2 minutos. GitHub te da la URL pública (algo como `https://TU_USUARIO.github.io/alone-reportes-whatsapp/`).
6. Abre esa URL y confirma que ves la página con la lista de alumnos reales (misma prueba que hiciste en local, pero desde la URL pública).

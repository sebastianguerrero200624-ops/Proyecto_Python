// ===============================
// 🎠 Carrusel Automático e Interactivo
// ===============================

const carrusel = document.getElementById("slider-container");
const btnNext = document.getElementById("next");
const btnBack = document.getElementById("back");

if (carrusel && carrusel.children.length > 0) {
  const totalSlides = carrusel.children.length;
  let index = 0;
  let interval = null;

  const goToSlide = (i) => {
    index = (i + totalSlides) % totalSlides;
    carrusel.style.transform = `translateX(-${index * 100}%)`;
  };

  const nextSlide = () => goToSlide(index + 1);
  const prevSlide = () => goToSlide(index - 1);

  const startInterval = () => {
    clearInterval(interval);
    interval = setInterval(nextSlide, 5000); // Cambia cada 5s
  };

  const resetInterval = () => {
    clearInterval(interval);
    startInterval();
  };

  // Eventos de los botones
  btnNext?.addEventListener("click", () => {
    nextSlide();
    resetInterval();
  });

  btnBack?.addEventListener("click", () => {
    prevSlide();
    resetInterval();
  });

  // Inicia el carrusel automáticamente
  startInterval();
}

// ===============================
// 🧠 Imagen Interactiva con Efecto 3D + Cambio de Imagen
// ===============================

const interactiveImg = document.getElementById("interactive-img");
if (interactiveImg) {
  const images = [
    "Assets/img/fondo 2.jpg",
    "Assets/img/fondo.png",
    "Assets/img/fondo1.png"
  ];
  let currentImg = 0;
  let isAnimating = false;

  // Efecto 3D con el movimiento del mouse
  document.addEventListener("mousemove", (e) => {
    const { innerWidth, innerHeight } = window;
    const rotateX = -((e.clientY / innerHeight - 0.5) * 40);
    const rotateY = (e.clientX / innerWidth - 0.5) * 40;
    interactiveImg.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  // Efecto de "boing" + cambio de imagen al hacer clic
  interactiveImg.addEventListener("click", () => {
    if (isAnimating) return; // Evita clics repetidos
    isAnimating = true;

    interactiveImg.classList.add("boing");
    interactiveImg.addEventListener("animationend", function handler() {
      currentImg = (currentImg + 1) % images.length;
      interactiveImg.src = images[currentImg];
      interactiveImg.classList.remove("boing");
      interactiveImg.removeEventListener("animationend", handler);
      isAnimating = false;
    });
  });
  
}

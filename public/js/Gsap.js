gsap.registerPlugin(ScrollTrigger, TextPlugin);

const masterTimeline = gsap.timeline();

function createParticles() {
  const particlesContainer = document.getElementById("particles");
  if (!particlesContainer) return;

  const numberOfParticles = window.innerWidth < 768 ? 20 : 50;

  particlesContainer.innerHTML = "";

  for (let i = 0; i < numberOfParticles; i++) {
    const particle = document.createElement("div");
    particle.classList.add("particle");

    const size = Math.random() * 4 + 2;
    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particle.style.left = Math.random() * 100 + "%";
    particle.style.top = Math.random() * 100 + "%";

    particlesContainer.appendChild(particle);

    // Use a timeline for each particle to avoid conflicts
    const particleTl = gsap.timeline({ repeat: -1 });
    particleTl
      .to(particle, {
        y: -window.innerHeight - 100,
        rotation: 360,
        duration: Math.random() * 20 + 15,
        ease: "none",
        delay: Math.random() * 10,
      })
      .to(
        particle,
        {
          x: (Math.random() - 0.5) * 100,
          duration: Math.random() * 10 + 5,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        },
        0
      );
  }
}

function initMainAnimations() {
  // Navigation entrance
  masterTimeline
    .from("header .slide-in-left", {
      x: -100,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    })
    .from(
      "header .slide-in-right, #hero .slide-in-right",
      {
        x: 100,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.6"
    );

  // Hero section entrance
  masterTimeline
    .from(
      "#hero .fade-in",
      {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
      },
      "-=0.4"
    )
    .from(
      "#hero .scale-in",
      {
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.7)",
      },
      "-=0.4"
    );

  // Typewriter effect - Replaced with GSAP TextPlugin for better sync
  const typewriterElement = document.getElementById("typewriter-text");
  if (typewriterElement) {
    const typewriterText =
      "From Space to Your Screen — The World's Air, Visualized.";
    masterTimeline.to(
      typewriterElement,
      {
        duration: 2.5,
        text: typewriterText,
        ease: "none",
      },
      "-=0.2"
    );
  }

  const globeImg = document.querySelector("#globe-container img");
  if (globeImg) {
    gsap.to(globeImg, {
      rotation: 360,
      duration: 60,
      repeat: -1,
      ease: "none",
    });
  }

  const globeRings = document.querySelectorAll(".globe-ring");
  if (globeRings.length > 0) {
    gsap.to(globeRings, {
      scale: 1.05,
      opacity: 0.8,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.5,
    });
  }

  // Button pulse effect
  const mainButton = document.getElementById("checkMyCityBtn");
  if (mainButton) {
    gsap.to(mainButton, {
      scale: 1.02,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 2,
    });
  }

  // Setup scroll-triggered animations
  setupScrollAnimations();

  // Interactive hover effects
  setupHoverEffects();
}

function setupScrollAnimations() {
  gsap.utils.toArray(".fade-in").forEach((element) => {
    if (element.closest("#hero")) return;

    gsap.from(element, {
      scrollTrigger: {
        trigger: element,
        start: "top 85%",
        end: "bottom 20%",
        toggleActions: "play none none reverse",
        onToggle: (self) =>
          gsap.set(self.trigger, {
            willChange: self.isActive ? "transform, opacity" : "auto",
          }),
        markers: false,
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    });
  });

  // // Scale in elements on scroll
  // gsap.utils.toArray(".scale-in").forEach((element, index) => {
  //   if (element.closest("#hero")) return;
  //   if (element.closest("header")) return;

  //   gsap.from(element, {
  //     scrollTrigger: {
  //       trigger: element,
  //       start: "top 85%",
  //       end: "bottom 15%",
  //       onToggle: (self) =>
  //         gsap.set(self.trigger, {
  //           willChange: self.isActive ? "transform, opacity" : "auto",
  //         }),
  //       toggleActions: "play none none reverse",
  //     },
  //     scale: 0.8,
  //     opacity: 0,
  //     duration: 0.6,
  //     delay: index * 0.1,
  //     ease: "back.out(1.7)",
  //   });
  // });

  // const slideInElements = gsap.utils.toArray(
  //   "#keyFeatures .slide-in-left, #keyFeatures .slide-in-right"
  // );
  // slideInElements.forEach((element, index) => {
  //   if (element.closest("header")) return;

  //   const isLeft = element.classList.contains("slide-in-left");
  //   gsap.from(element, {
  //     scrollTrigger: {
  //       trigger: element,
  //       start: "top 80%",
  //       toggleActions: "play none none reverse",
  //       onToggle: (self) =>
  //         gsap.set(self.trigger, {
  //           willChange: self.isActive ? "transform, opacity" : "auto",
  //         }),
  //     },
  //     x: isLeft ? -100 : 100,
  //     opacity: 0,
  //     duration: 0.8,
  //     delay: index * 0.15,
  //     ease: "power2.out",
  //   });
  // });

  if (document.querySelector("#progressBar")) {
    gsap.to("#progressBar", {
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
      scaleX: 1,
      transformOrigin: "left center",
    });
  }

  ScrollTrigger.matchMedia({
    "(min-width: 768px)": function () {
      gsap.to("#hero", {
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
        yPercent: -30,
        ease: "none",
      });
    },
  });

  // Header scroll effect
  const header = document.querySelector("header");
  if (header) {
    ScrollTrigger.create({
      trigger: "body",
      start: "50px top",
      end: "bottom bottom",
      onToggle: (self) => header.classList.toggle("scrolled", self.isActive),
    });
  }
}

// Interactive hover effects
function setupHoverEffects() {
  document.querySelectorAll(".resource-card").forEach((card) => {
    const hoverTl = gsap.timeline({ paused: true });
    const img = card.querySelector("img");

    hoverTl.to(card, {
      y: -10,
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out",
    });

    if (img) {
      hoverTl.to(
        img,
        {
          scale: 1.1,
          duration: 0.3,
          ease: "power2.out",
        },
        0
      );
    }

    card.addEventListener("mouseenter", () => hoverTl.play());
    card.addEventListener("mouseleave", () => hoverTl.reverse());
  });

  // Feature cards
  document.querySelectorAll(".feature-card").forEach((card) => {
    const hoverTl = gsap.timeline({ paused: true });

    hoverTl.to(card, {
      y: -8,
      boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
      duration: 0.3,
      ease: "power2.out",
    });

    card.addEventListener("mouseenter", () => hoverTl.play());
    card.addEventListener("mouseleave", () => hoverTl.reverse());
  });

  // Button interactions
  document.querySelectorAll(".btn, .button").forEach((button) => {
    button.addEventListener("mouseenter", () => {
      gsap.to(button, {
        scale: 1.05,
        duration: 0.2,
        ease: "power2.out",
      });
    });

    button.addEventListener("mouseleave", () => {
      gsap.to(button, {
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
      });
    });
  });

  // Input field focus effects
  const searchInput = document.getElementById("Search");
  if (searchInput && searchInput.parentElement) {
    searchInput.addEventListener("focus", () => {
      gsap.to(searchInput.parentElement, {
        scale: 1.02,
        boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
        duration: 0.3,
        ease: "power2.out",
      });
    });

    searchInput.addEventListener("blur", () => {
      gsap.to(searchInput.parentElement, {
        scale: 1,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        duration: 0.3,
        ease: "power2.out",
      });
    });
  }
}

// Smooth scrolling for navigation
function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        const targetPosition = target.offsetTop - 80;
        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });
      }
    });
  });
}

// Responsive particle adjustment
function adjustParticlesForDevice() {
  if (window.innerWidth < 768) {
    const particles = document.querySelectorAll(".particle");
    gsap.to(particles, {
      duration: 0.5,
      ease: "power2.out",
      modifiers: {
        scale: () => Math.random() * 0.5 + 0.5,
      },
    });
  }
}

window.addEventListener("load", () => {
  createParticles();

  initMainAnimations();

  adjustParticlesForDevice();

  setupSmoothScrolling();

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      adjustParticlesForDevice();
      if (Math.abs(window.innerWidth - (window.previousWidth || 0)) > 100) {
        createParticles();
        window.previousWidth = window.innerWidth;
      }
    }, 250);
  });

  window.previousWidth = window.innerWidth;
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    gsap.globalTimeline.pause();
  } else {
    gsap.globalTimeline.resume();
  }
});

const logoElement = document.querySelector(".logo");
if (logoElement) {
  logoElement.addEventListener("dblclick", () => {
    gsap.to(logoElement, {
      rotation: 360,
      scale: 1.2,
      duration: 0.8,
      ease: "back.out(1.7)",
      yoyo: true,
      repeat: 1,
    });

    const particles = document.querySelectorAll(".particle");
    if (particles.length > 0) {
      gsap.to(particles, {
        scale: 2,
        opacity: 0.8,
        duration: 0.5,
        stagger: 0.02,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
      });
    }
  });
}

// Error handling for missing elements
window.addEventListener("error", (e) => {
  console.warn("Animation error caught and handled:", e.message);
  // Continue with basic functionality even if animations fail
});

// Fallback for browsers that don't support GSAP
if (typeof gsap === "undefined") {
  console.warn("GSAP not loaded, falling back to CSS animations");
  document.body.classList.add("no-gsap");
}

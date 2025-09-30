gsap.registerPlugin(ScrollTrigger, TextPlugin);

let masterTimeline = gsap.timeline();
let isAnimationComplete = false;

function elementExists(selector) {
  return document.querySelector(selector) !== null;
}

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

    gsap.to(particle, {
      y: -window.innerHeight - 100,
      rotation: 360,
      duration: Math.random() * 20 + 15,
      repeat: -1,
      ease: "none",
      delay: Math.random() * 10,
    });

    gsap.to(particle, {
      x: (Math.random() - 0.5) * 100,
      duration: Math.random() * 10 + 5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }
}

function initMainAnimations() {
  masterTimeline = gsap.timeline();

  // Navigation entrance
  masterTimeline
    .from(".slide-in-left", {
      x: -100,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    })
    .from(
      ".slide-in-right",
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

  // Typewriter effect - Fixed
  const typewriterElement = document.getElementById("typewriter-text");
  if (typewriterElement) {
    const typewriterText =
      "From Space to Your Screen — The World's Air, Visualized.";
    let typewriterIndex = 0;

    function typeWriter() {
      if (typewriterIndex < typewriterText.length && typewriterElement) {
        typewriterElement.textContent += typewriterText.charAt(typewriterIndex);
        typewriterIndex++;
        setTimeout(typeWriter, 50);
      } else {
        // Start cursor blinking after typing is complete
        const cursor = document.querySelector(".typewriter-cursor");
        if (cursor) {
          gsap.to(cursor, {
            opacity: 0,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
          });
        }
      }
    }

    // Start typewriter after initial animations
    masterTimeline.call(typeWriter, null, null, 0.5);
  }

  // Globe animations - Fixed to use actual elements
  const globeImg = document.querySelector("#globe-container img");
  if (globeImg) {
    gsap.to(globeImg, {
      rotation: 360,
      duration: 60,
      repeat: -1,
      ease: "none",
    });
  }

  // Globe rings glow effect - Fixed
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

  // Mark animations as complete
  isAnimationComplete = true;
}

// Scroll-triggered animations
function setupScrollAnimations() {
  // Fade in elements
  gsap.utils.toArray(".fade-in").forEach((element) => {
    if (element.closest("#hero")) return; // Skip hero elements as they're already animated

    gsap.from(element, {
      scrollTrigger: {
        trigger: element,
        start: "top 85%",
        end: "bottom 20%",
        toggleActions: "play none none reverse",
        markers: false,
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    });
  });

  // Scale in elements
  gsap.utils.toArray(".scale-in").forEach((element, index) => {
    if (element.closest("#hero")) return; // Skip hero elements

    gsap.from(element, {
      scrollTrigger: {
        trigger: element,
        start: "top 85%",
        end: "bottom 15%",
        toggleActions: "play none none reverse",
      },
      scale: 0.8,
      opacity: 0,
      duration: 0.6,
      delay: index * 0.1,
      ease: "back.out(1.7)",
    });
  });

  // Slide in from left
  gsap.utils
    .toArray("#keyFeatures .slide-in-left")
    .forEach((element, index) => {
      gsap.from(element, {
        scrollTrigger: {
          trigger: element,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        x: -100,
        opacity: 0,
        duration: 0.8,
        delay: index * 0.15,
        ease: "power2.out",
      });
    });

  // Slide in from right
  gsap.utils
    .toArray("#keyFeatures .slide-in-right")
    .forEach((element, index) => {
      gsap.from(element, {
        scrollTrigger: {
          trigger: element,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        x: 100,
        opacity: 0,
        duration: 0.8,
        delay: index * 0.15,
        ease: "power2.out",
      });
    });

  // Progress bar scroll indicator
  if (elementExists("#progressBar")) {
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

  // Parallax effect for hero
  if (elementExists("#hero")) {
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
  }
}

// Interactive hover effects
function setupHoverEffects() {
  // Resource cards
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
    // Reduce particle effects on mobile for better performance
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

// Initialize everything when page loads
window.addEventListener("load", () => {
  // Create particles first
  createParticles();

  // Start main animations directly
  initMainAnimations();

  // Setup responsive adjustments
  adjustParticlesForDevice();

  // Setup smooth scrolling
  setupSmoothScrolling();

  // Handle window resize
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      adjustParticlesForDevice();
      // Recreate particles on significant size changes
      if (Math.abs(window.innerWidth - (window.previousWidth || 0)) > 100) {
        createParticles();
        window.previousWidth = window.innerWidth;
      }
    }, 250);
  });

  window.previousWidth = window.innerWidth;
});

// Performance optimization: Pause animations when page is hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    gsap.globalTimeline.pause();
  } else {
    gsap.globalTimeline.resume();
  }
});

// Easter egg: Double-click logo for special animation
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

    // Trigger particle burst
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

// Intersection Observer for performance optimization
const observerOptions = {
  root: null,
  rootMargin: "50px",
  threshold: 0.1,
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      // Element is visible, ensure animations are active
      gsap.set(entry.target, { willChange: "transform, opacity" });
    } else {
      // Element is not visible, optimize performance
      gsap.set(entry.target, { willChange: "auto" });
    }
  });
}, observerOptions);

// Observe all animated elements
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for elements to be ready
  setTimeout(() => {
    document
      .querySelectorAll(".fade-in, .slide-in-left, .slide-in-right, .scale-in")
      .forEach((el) => {
        observer.observe(el);
      });
  }, 100);
});

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

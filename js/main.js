(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Hero background video: don't auto-play motion for users who've
     asked for reduced motion; the poster frame stands in instead.
     ------------------------------------------------------------------ */
  var heroVideo = document.querySelector('.hero__bg video');
  if (heroVideo && reduceMotion) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  /* ------------------------------------------------------------------
     Nav: scrolled state + mobile toggle
     ------------------------------------------------------------------ */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  var navMobile = document.getElementById('navMobile');

  function onScroll() {
    if (window.scrollY > 40) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = navMobile.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navMobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navMobile.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------
     Articles carousel: arrow buttons scroll the card row.
     ------------------------------------------------------------------ */
  var newsGrid = document.getElementById('newsGrid');
  var newsPrev = document.getElementById('newsPrev');
  var newsNext = document.getElementById('newsNext');
  if (newsGrid && newsPrev && newsNext) {
    var scrollByCard = function (dir) {
      var card = newsGrid.querySelector('.news__card');
      var amount = card ? card.getBoundingClientRect().width + 20 : 320;
      newsGrid.scrollBy({ left: dir * amount, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    newsPrev.addEventListener('click', function () { scrollByCard(-1); });
    newsNext.addEventListener('click', function () { scrollByCard(1); });
  }

  /* ------------------------------------------------------------------
     Sticky mobile "Apply" bar: appears once the hero scrolls out of
     view, hides again once the real apply form is on screen.
     ------------------------------------------------------------------ */
  var stickyCta = document.getElementById('stickyCta');
  var heroSection = document.getElementById('hero');
  var applySection = document.getElementById('apply');

  if (stickyCta && heroSection && applySection && 'IntersectionObserver' in window) {
    var heroPast = false;
    var applyVisible = false;

    function syncSticky() {
      var show = heroPast && !applyVisible;
      stickyCta.classList.toggle('is-visible', show);
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { heroPast = !entry.isIntersecting; });
      syncSticky();
    }, { threshold: 0 }).observe(heroSection);

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { applyVisible = entry.isIntersecting; });
      syncSticky();
    }, { threshold: 0.15 }).observe(applySection);
  }

  /* ------------------------------------------------------------------
     Apply form: client-side validation + success state.
     NOTE: this form has no backend wired up yet. Point the fetch()
     call below at a real endpoint (Formspree, Netlify Forms, your own
     API, etc.) before launch. Right now it only validates and shows
     a success message locally.
     ------------------------------------------------------------------ */
  var applyForm = document.getElementById('applyForm');
  if (applyForm) {
    var applyNote = document.getElementById('applyNote');
    var applySubmit = applyForm.querySelector('.apply__submit');
    var applySubmitLabel = applyForm.querySelector('.apply__submit-label');

    applyForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var valid = true;
      applyForm.querySelectorAll('.apply__field').forEach(function (field) {
        var input = field.querySelector('input, select');
        var ok = input.checkValidity();
        field.classList.toggle('has-error', !ok);
        if (!ok) valid = false;
      });

      if (!valid) {
        applyNote.textContent = 'Please fix the highlighted fields.';
        applyNote.className = 'apply__form-note is-error';
        var firstError = applyForm.querySelector('.has-error input, .has-error select');
        if (firstError) firstError.focus();
        return;
      }

      applyNote.textContent = '';
      applyNote.className = 'apply__form-note';
      applySubmit.disabled = true;
      applySubmitLabel.textContent = 'Submitting…';

      // Send data to Google Forms
      var googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfnt08EgsikmotyYxcCPPUpQCZI3XID_8yVVHkLHyX9ertJXA/formResponse';
      var formData = new FormData(applyForm);
      var googleData = new URLSearchParams();
      
      // Map local form fields to Google Form entry IDs
      googleData.append('entry.451332127', formData.get('name') || '');
      googleData.append('entry.862746031', formData.get('email') || '');
      googleData.append('entry.937863818', formData.get('phone') || '');
      
      // Map the dropdown value to exactly match the Google Form option text
      var rawGoal = formData.get('goal');
      var mappedGoal = '';
      if (rawGoal === 'startup') mappedGoal = 'Launching a startup';
      else if (rawGoal === 'job') mappedGoal = 'Getting hired in AI';
      else if (rawGoal === 'explore') mappedGoal = 'Still exploring';
      
      googleData.append('entry.1729132919', mappedGoal);
      
      fetch(googleFormUrl, {
        method: 'POST',
        mode: 'no-cors', // Essential for submitting to Google Forms from a browser without CORS errors
        body: googleData // Browser will automatically set correct Content-Type for URLSearchParams
      }).then(function() {
        applyForm.classList.add('is-sent');
        applySubmit.disabled = false;
        applySubmitLabel.textContent = 'Submit Application';
      }).catch(function(error) {
        console.error("Form submission error:", error);
        applyNote.textContent = 'Network error. Please try again later.';
        applyNote.className = 'apply__form-note is-error';
        applySubmit.disabled = false;
        applySubmitLabel.textContent = 'Submit Application';
      });
    });
  }

  /* ------------------------------------------------------------------
     Scroll reveals (IntersectionObserver, no GSAP dependency needed)
     ------------------------------------------------------------------ */

  // Force redirect for Take Assessment links to bypass cached HTML
  var takeAssessmentLinks = document.querySelectorAll('a');
  takeAssessmentLinks.forEach(function(link) {
    if (link.textContent.trim() === 'Take Assessment' || link.textContent.includes('Take Assessment to Check')) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'http://localhost:5173';
      });
    }
  });

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ------------------------------------------------------------------
     Hero -> Funding scroll-morph
     Pins the hero+funding pair; a cloned image animates from the
     hero's featured thumbnail rect to the funding section's image
     rect while the two sections cross-fade.
     ------------------------------------------------------------------ */
  function initMorph() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    var pin = document.getElementById('expandPin');
    var hero = document.getElementById('hero');
    var funding = document.getElementById('seek-funding');
    var morph = document.getElementById('morphImage');
    var srcThumb = document.querySelector('.hero__thumb--active');

    if (!pin || !hero || !funding || !morph || !srcThumb) return;

    var heroLeft = document.getElementById('heroLeft');
    var heroRight = document.getElementById('heroRight');
    var fundingRight = document.getElementById('fundingRight');
    var fundingLeft = funding.querySelector('.funding__left');
    var fundingImg = fundingLeft.querySelector('img');

    if (!heroLeft || !heroRight || !fundingRight || !fundingLeft || !fundingImg) return;

    var mm = gsap.matchMedia();

    // Desktop / motion-ok: pinned scroll-morph from thumbnail to the funding visual.
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
      function rectRelativeToPin(el) {
        var r = el.getBoundingClientRect();
        var p = pin.getBoundingClientRect();
        return { left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height };
      }

      morph.style.display = 'block';
      gsap.set(heroLeft, { opacity: 1, y: 0 });
      gsap.set(heroRight, { opacity: 1, y: 0 });
      gsap.set(hero, { opacity: 1 });
      gsap.set(fundingRight, { opacity: 0, y: 24 });
      gsap.set(funding, { opacity: 0 });
      gsap.set(fundingImg, { opacity: 0 });

      var ease = gsap.parseEase('power2.inOut');
      function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
      function lerp(a, b, t) { return a + (b - a) * t; }

      var srcRect, dstRect;
      function layoutMorph() {
        srcRect = rectRelativeToPin(srcThumb);
        dstRect = rectRelativeToPin(fundingLeft);
        gsap.set(morph, {
          left: srcRect.left, top: srcRect.top,
          width: srcRect.width, height: srcRect.height,
          borderRadius: 14, opacity: 1
        });
      }
      layoutMorph();

      var trigger = ScrollTrigger.create({
        trigger: pin,
        start: 'top top',
        end: '+=120%',
        pin: true,
        scrub: 1,
        onRefresh: layoutMorph,
        onUpdate: function (self) {
          var p = self.progress;

          var heroFade = 1 - clamp01(p / 0.38);
          gsap.set(heroLeft, { opacity: heroFade, y: (1 - heroFade) * -26 });
          gsap.set(heroRight, { opacity: heroFade, y: (1 - heroFade) * -26 });
          gsap.set(hero, { opacity: 1 - clamp01((p - 0.4) / 0.08) });
          gsap.set(funding, { opacity: clamp01((p - 0.34) / 0.14) });

          var morphT = ease(clamp01((p - 0.04) / 0.6));
          gsap.set(morph, {
            left: lerp(srcRect.left, dstRect.left, morphT),
            top: lerp(srcRect.top, dstRect.top, morphT),
            width: lerp(srcRect.width, dstRect.width, morphT),
            height: lerp(srcRect.height, dstRect.height, morphT),
            borderRadius: lerp(14, 24, morphT)
          });

          var textT = clamp01((p - 0.48) / 0.3);
          gsap.set(fundingRight, { opacity: textT, y: (1 - textT) * 24 });

          var crossT = clamp01((p - 0.82) / 0.16);
          gsap.set(morph, { opacity: 1 - crossT });
          gsap.set(fundingImg, { opacity: crossT });
        }
      });

      var onResize = function () { layoutMorph(); ScrollTrigger.refresh(); };
      window.addEventListener('resize', onResize);

      // Cleanup when the media query stops matching (mobile, or reduced-motion toggled on).
      return function () {
        window.removeEventListener('resize', onResize);
        trigger.kill();
        gsap.set([heroLeft, heroRight, hero, funding, fundingRight, fundingImg, morph], { clearProps: 'all' });
      };
    });

    // Mobile / reduced-motion: static fallback, everything just visible in normal flow.
    mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', function () {
      morph.style.display = 'none';
      gsap.set([heroLeft, heroRight, hero, funding], { clearProps: 'all' });
      gsap.set(fundingRight, { opacity: 1, y: 0 });
      gsap.set(fundingImg, { opacity: 1 });
    });
  }

  initMorph();
  if (typeof ScrollTrigger !== 'undefined') {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();

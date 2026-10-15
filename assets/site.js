(function(){
  /* Always land at the top when a page opens — overrides both the
     browser's scroll-restoration on back/forward (e.g. via bfcache) and
     its default jump to a URL hash, so a link like home.html#menu or
     home.html#book (nav links, "Get a Quote" buttons) still opens at the
     top of the page instead of mid-scroll at that section. */
  if('scrollRestoration' in history){ history.scrollRestoration = 'manual'; }
  function forceTop(){ window.scrollTo(0, 0); }
  forceTop();
  window.addEventListener('load', forceTop);
  /* pageshow also covers a page served from the back/forward cache
     (bfcache), where the browser resumes the document instead of
     reloading it, so neither our script nor the 'load' event re-run. */
  window.addEventListener('pageshow', forceTop);
  /* Chromium keeps re-applying the URL hash's scroll position for a
     short window after load while the page is still settling (web
     fonts swapping in, images loading in) — reassert the top a few
     more times so that retry doesn't win the race. Stops the instant
     the visitor actually scrolls, so it never fights a fast reader. */
  var pendingTopScrolls = [50, 150, 300, 500].map(function(ms){
    return window.setTimeout(forceTop, ms);
  });
  function cancelForceTop(){
    pendingTopScrolls.forEach(function(id){ window.clearTimeout(id); });
    pendingTopScrolls.length = 0;
  }
  window.addEventListener('wheel', cancelForceTop, { passive:true, once:true });
  window.addEventListener('touchmove', cancelForceTop, { passive:true, once:true });
  window.addEventListener('keydown', cancelForceTop, { once:true });
  /* A click (e.g. a same-page "#menu" nav link) can trigger the
     browser's own anchor scroll; hashchange covers that precisely,
     and a generic click is a catch-all for any other interaction. */
  window.addEventListener('hashchange', cancelForceTop, { once:true });
  window.addEventListener('click', cancelForceTop, { once:true });

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile nav toggle ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var mobileNav = document.getElementById('mobileNav');
  if(navToggle && mobileNav){
    function closeMobileNav(){
      mobileNav.hidden = true;
      navToggle.setAttribute('aria-expanded', 'false');
    }
    navToggle.addEventListener('click', function(){
      var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if(isOpen){ closeMobileNav(); }
      else{ mobileNav.hidden = false; navToggle.setAttribute('aria-expanded', 'true'); }
    });
    mobileNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', closeMobileNav);
    });
    window.addEventListener('resize', function(){
      if(window.innerWidth > 760){ closeMobileNav(); }
    });
  }

  function setupCarousel(root, slideSel, dotSel, intervalMs){
    if(!root) return;
    var slides = root.querySelectorAll(slideSel);
    var dots = root.querySelectorAll(dotSel);
    if(!slides.length) return;
    var current = 0;

    function show(i){
      slides[current].classList.remove('is-active');
      if(dots[current]) dots[current].classList.remove('is-active');
      current = i;
      slides[current].classList.add('is-active');
      if(dots[current]) dots[current].classList.add('is-active');
    }
    dots.forEach(function(dot, i){
      dot.addEventListener('click', function(){ show(i); resetTimer(); });
    });
    var timer;
    function resetTimer(){
      if(reduceMotion) return;
      clearInterval(timer);
      timer = setInterval(function(){ show((current + 1) % slides.length); }, intervalMs);
    }
    resetTimer();
  }

  setupCarousel(document.getElementById('heroCarousel'), '.slide', '.hero-dots button', 4800);
  setupCarousel(document.getElementById('reviewRotator'), '.review-slide', '.review-dots button', 6500);

  /* ---------- offers: centered, circular carousel with faded side peeks ----------
     The first/last real slides are cloned to the opposite ends of the track so
     there's always a neighbour to peek at. Stepping onto a clone animates
     normally, then snaps (no transition) to the matching real slide once the
     animation ends, so the loop feels seamless. */
  var offerRoot = document.getElementById('offerCarousel');
  if(offerRoot){
    var offerViewport = offerRoot.querySelector('.offer-viewport');
    var offerTrack = offerRoot.querySelector('.offer-track');
    var offerDots = offerRoot.querySelectorAll('.offer-dots button');
    var offerPrevBtn = offerRoot.querySelector('.offer-arrow-prev');
    var offerNextBtn = offerRoot.querySelector('.offer-arrow-next');

    var offerReal = Array.prototype.slice.call(offerTrack.querySelectorAll('.offer-slide'));
    offerReal.forEach(function(slide, i){ slide.dataset.index = i; });

    var offerFirstClone = offerReal[0].cloneNode(true);
    var offerLastClone = offerReal[offerReal.length - 1].cloneNode(true);
    offerFirstClone.setAttribute('aria-hidden', 'true');
    offerLastClone.setAttribute('aria-hidden', 'true');
    offerTrack.insertBefore(offerLastClone, offerReal[0]);
    offerTrack.appendChild(offerFirstClone);

    var offerTrackSlides = Array.prototype.slice.call(offerTrack.children);
    var offerPos = 1; // index into offerTrackSlides; starts on the first real slide

    function offerRender(){
      offerTrackSlides.forEach(function(slide, i){
        slide.classList.toggle('is-active', i === offerPos);
      });
      var realIndex = parseInt(offerTrackSlides[offerPos].dataset.index, 10);
      offerDots.forEach(function(dot, i){ dot.classList.toggle('is-active', i === realIndex); });
    }

    function offerCenterOn(targetPos, animate){
      var slide = offerTrackSlides[targetPos];
      var offset = offerViewport.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
      if(!animate){ offerTrack.style.transition = 'none'; }
      offerTrack.style.transform = 'translateX(' + offset + 'px)';
      if(!animate){
        offerTrack.offsetHeight; /* force reflow so the instant jump renders before re-enabling the transition */
        offerTrack.style.transition = '';
      }
    }

    function offerGoToPos(targetPos){
      offerPos = targetPos;
      offerRender();
      offerCenterOn(offerPos, true);
    }

    offerTrack.addEventListener('transitionend', function(e){
      if(e.target !== offerTrack || e.propertyName !== 'transform') return;
      if(offerPos === 0){
        offerPos = offerTrackSlides.length - 2;
        offerRender();
        offerCenterOn(offerPos, false);
      } else if(offerPos === offerTrackSlides.length - 1){
        offerPos = 1;
        offerRender();
        offerCenterOn(offerPos, false);
      }
    });

    offerTrackSlides.forEach(function(slide, i){
      slide.addEventListener('click', function(e){
        if(i !== offerPos){
          e.preventDefault();
          offerGoToPos(i);
        }
      });
    });
    offerDots.forEach(function(dot, i){
      dot.addEventListener('click', function(){ offerGoToPos(i + 1); });
    });
    if(offerPrevBtn) offerPrevBtn.addEventListener('click', function(){ offerGoToPos(offerPos - 1); });
    if(offerNextBtn) offerNextBtn.addEventListener('click', function(){ offerGoToPos(offerPos + 1); });

    var offerTouchStartX = null;
    offerTrack.addEventListener('touchstart', function(e){ offerTouchStartX = e.touches[0].clientX; }, { passive:true });
    offerTrack.addEventListener('touchend', function(e){
      if(offerTouchStartX === null) return;
      var dx = e.changedTouches[0].clientX - offerTouchStartX;
      if(Math.abs(dx) > 40){ offerGoToPos(offerPos + (dx < 0 ? 1 : -1)); }
      offerTouchStartX = null;
    }, { passive:true });

    window.addEventListener('resize', function(){ offerCenterOn(offerPos, false); });

    offerRender();
    offerCenterOn(offerPos, false);
  }

  /* ---------- season: two-page flip-book menu ----------
     The cover spans the full book and is hinged at the book's true left
     edge (the spine), so opening it swings the whole cover out of view.
     Underneath, a static title page always occupies the left half; each
     .book-leaf is half-width and hinged at the book's horizontal center,
     so turning one reveals its back as the new left page and the next
     leaf's front as the new right page — a real two-page spread. */
  var bookRoot = document.getElementById('seasonBook');
  if(bookRoot){
    var bookCover = bookRoot.querySelector('.book-cover');
    var bookLeaves = Array.prototype.slice.call(bookRoot.querySelectorAll('.book-leaf'));
    var bookLeafCount = bookLeaves.length;
    var bookTotalTurns = bookLeafCount + 1; // the cover counts as the first turn
    var bookNav = bookRoot.querySelector('.book-nav');
    var bookPrevBtn = bookRoot.querySelector('.book-prev');
    var bookNextBtn = bookRoot.querySelector('.book-next');
    var bookIndicator = bookRoot.querySelector('.book-pageindicator');
    var bookTurned = 0; // 0 = closed; N = N turns made (cover, then leaves 1..N-1)

    function bookLeafRestingZ(i, turned){
      return turned ? (2 + i) : (100 + (bookLeafCount - i));
    }
    bookLeaves.forEach(function(leaf, i){ leaf.style.zIndex = bookLeafRestingZ(i, false); });
    bookCover.style.zIndex = 1000;

    function bookRender(){
      bookRoot.classList.toggle('is-open', bookTurned > 0);
      if(bookNav) bookNav.hidden = bookTurned === 0;
      if(bookPrevBtn) bookPrevBtn.disabled = bookTurned === 0;
      if(bookNextBtn) bookNextBtn.disabled = bookTurned === bookTotalTurns - 1;
      if(bookIndicator) bookIndicator.textContent = bookTurned === 0 ? '' : bookTurned + ' / ' + (bookTotalTurns - 1);
    }

    function bookTurnForward(){
      if(bookTurned >= bookTotalTurns - 1) return;
      if(bookTurned === 0){
        bookCover.style.zIndex = 2000;
        bookCover.classList.add('is-turned');
        window.setTimeout(function(){ bookCover.style.zIndex = 0; }, 800);
      } else {
        var i = bookTurned - 1;
        var leaf = bookLeaves[i];
        leaf.style.zIndex = 2000;
        leaf.classList.add('is-turned');
        window.setTimeout(function(){ leaf.style.zIndex = bookLeafRestingZ(i, true); }, 700);
      }
      bookTurned++;
      bookRender();
    }

    function bookTurnBackward(){
      if(bookTurned <= 0) return;
      bookTurned--;
      if(bookTurned === 0){
        bookCover.style.zIndex = 2000;
        bookCover.classList.remove('is-turned');
        window.setTimeout(function(){ bookCover.style.zIndex = 1000; }, 800);
      } else {
        var i = bookTurned - 1;
        var leaf = bookLeaves[i];
        leaf.style.zIndex = 2000;
        leaf.classList.remove('is-turned');
        window.setTimeout(function(){ leaf.style.zIndex = bookLeafRestingZ(i, false); }, 700);
      }
      bookRender();
    }

    bookCover.addEventListener('click', function(){ if(bookTurned === 0) bookTurnForward(); });
    if(bookNextBtn) bookNextBtn.addEventListener('click', bookTurnForward);
    if(bookPrevBtn) bookPrevBtn.addEventListener('click', bookTurnBackward);

    bookRender();
  }

  /* ---------- gate page: fade the scroll hint once the visitor starts scrolling ---------- */
  var scrollHint = document.getElementById('gateScrollHint');
  if(scrollHint){
    window.addEventListener('scroll', function(){
      scrollHint.classList.toggle('is-hidden', window.scrollY > 40);
    }, { passive:true });
  }

  /* ---------- gallery page: fade the hero text and clear the fog once scrolling starts ---------- */
  if(document.querySelector('.gallery-hero')){
    window.addEventListener('scroll', function(){
      document.body.classList.toggle('is-gallery-scrolled', window.scrollY > 40);
    }, { passive:true });
  }

  var eventSelect = document.getElementById('event');

  document.querySelectorAll('[data-event]').forEach(function(el){
    el.addEventListener('click', function(){
      if(eventSelect){ eventSelect.value = el.getAttribute('data-event'); }
    });
  });

  /* ---------- incoming ?event= from other pages (e.g. menu.html quote buttons) ---------- */
  if(eventSelect){
    var params = new URLSearchParams(window.location.search);
    var incomingEvent = params.get('event');
    if(incomingEvent){
      eventSelect.value = incomingEvent;
      window.requestAnimationFrame(function(){
        var bookEl = document.getElementById('book');
        if(bookEl){ bookEl.scrollIntoView({ behavior:'smooth', block:'start' }); }
      });
    }
  }

  /* ---------- detail page router ---------- */
  var homeView = document.getElementById('homeView');
  var detailPages = document.querySelectorAll('.detail-page');
  var routeMap = {
    'date-dinner': 'page-date-dinner',
    'private-dinner': 'page-private-dinner',
    'paella-workshop': 'page-paella-workshop',
    'borrel-catering': 'page-borrel-catering'
  };

  var currentView = 'home';

  function showView(id){
    var changed = (id !== currentView);
    if(homeView){ homeView.hidden = (id !== 'home'); }
    detailPages.forEach(function(page){
      page.hidden = (page.id !== id);
    });
    currentView = id;
    /* Only snap to the top when we're actually switching between the
       home page and a detail page. A plain in-page anchor (#menu,
       #season, #book...) while already on the home view
       should scroll natively to that section, not get reset to 0,0. */
    if(changed){ window.scrollTo(0, 0); }
  }

  function applyRoute(){
    var hash = (window.location.hash || '').replace('#', '');
    var pageId = routeMap[hash];
    showView(pageId || 'home');
  }

  window.addEventListener('hashchange', applyRoute);
  applyRoute();

  document.querySelectorAll('.detail-book-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      showView('home');
      if(window.history && window.history.replaceState){
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#book');
      }
      if(eventSelect){ eventSelect.value = btn.getAttribute('data-event'); }
      window.requestAnimationFrame(function(){
        var bookEl = document.getElementById('book');
        if(bookEl){ bookEl.scrollIntoView({ behavior:'smooth', block:'start' }); }
      });
    });
  });

  /* ---------- date dinner: full-screen left-right carousel ---------- */
  var ddTrack = document.getElementById('ddTrack');
  if(ddTrack){
    var ddSlides = ddTrack.querySelectorAll('.dd-slide');
    var ddPrev = document.getElementById('ddPrev');
    var ddNext = document.getElementById('ddNext');
    var ddDotsWrap = document.getElementById('ddDots');
    var ddIndex = 0;

    ddSlides.forEach(function(_, i){
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', function(){ ddGoTo(i); });
      ddDotsWrap.appendChild(dot);
    });
    var ddDots = ddDotsWrap.querySelectorAll('button');

    function ddUpdate(){
      ddTrack.style.transform = 'translateX(-' + (ddIndex * 100) + '%)';
      ddDots.forEach(function(d, i){ d.classList.toggle('is-active', i === ddIndex); });
      ddPrev.classList.toggle('is-hidden', ddIndex === 0);
      ddNext.classList.toggle('is-hidden', ddIndex === ddSlides.length - 1);
    }
    function ddGoTo(i){
      ddIndex = Math.max(0, Math.min(ddSlides.length - 1, i));
      ddUpdate();
    }
    ddNext.addEventListener('click', function(){ ddGoTo(ddIndex + 1); });
    ddPrev.addEventListener('click', function(){ ddGoTo(ddIndex - 1); });

    document.addEventListener('keydown', function(e){
      var page = document.getElementById('page-date-dinner');
      if(!page || page.hidden) return;
      if(e.key === 'ArrowRight') ddGoTo(ddIndex + 1);
      if(e.key === 'ArrowLeft') ddGoTo(ddIndex - 1);
    });

    var ddTouchStartX = null;
    ddTrack.addEventListener('touchstart', function(e){ ddTouchStartX = e.touches[0].clientX; }, { passive:true });
    ddTrack.addEventListener('touchend', function(e){
      if(ddTouchStartX === null) return;
      var dx = e.changedTouches[0].clientX - ddTouchStartX;
      if(Math.abs(dx) > 40){ ddGoTo(ddIndex + (dx < 0 ? 1 : -1)); }
      ddTouchStartX = null;
    }, { passive:true });

    window.addEventListener('hashchange', function(){
      if(window.location.hash === '#date-dinner'){ ddGoTo(0); }
    });

    ddUpdate();
  }

  /* ---------- in-page scroll buttons (e.g. paella "What's Included") ---------- */
  document.querySelectorAll('.planet-scroll-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      var targetId = (btn.getAttribute('href') || '').replace('#', '');
      var target = targetId && document.getElementById(targetId);
      if(target){
        e.preventDefault();
        target.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  });

  /* ---------- paella: pick a workshop variant, swap the What's Included table ---------- */
  var variantCards = document.querySelectorAll('.variant-card[data-variant]');
  var paellaIncluded = document.getElementById('paella-included');
  if(variantCards.length && paellaIncluded){
    var variantLists = paellaIncluded.querySelectorAll('.included-list[data-list]');
    var variantTitle = paellaIncluded.querySelector('.planet-included-title');
    var variantNames = {
      authentic: 'Authentic Paella Workshop',
      viva: 'Viva La Cocina!'
    };
    var selectVariant = function(key){
      variantLists.forEach(function(list){
        list.hidden = (list.getAttribute('data-list') !== key);
      });
      if(variantTitle && variantNames[key]){ variantTitle.textContent = variantNames[key]; }
      paellaIncluded.setAttribute('data-active', key);
      paellaIncluded.hidden = false;
      variantCards.forEach(function(card){
        card.classList.toggle('is-active', card.getAttribute('data-variant') === key);
      });
    };
    variantCards.forEach(function(card){
      var key = card.getAttribute('data-variant');
      card.addEventListener('click', function(){
        selectVariant(key);
        window.requestAnimationFrame(function(){
          paellaIncluded.scrollIntoView({ behavior:'smooth', block:'start' });
        });
      });
      card.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          card.click();
        }
      });
    });
  }

  function buildMessage(){
    var name = document.getElementById('name').value.trim();
    var event = eventSelect.value;
    var date = document.getElementById('date').value;
    var guests = document.getElementById('guests').value;
    var message = document.getElementById('message').value.trim();

    var lines = ['Hi Fork It! I\'d like to reserve a spot.'];
    lines.push('Event: ' + event);
    if(name) lines.push('Name: ' + name);
    if(date) lines.push('Preferred date: ' + date);
    if(guests) lines.push('Guests: ' + guests);
    if(message) lines.push('Details: ' + message);
    return lines.join('\n');
  }

  var bookingForm = document.getElementById('bookingForm');

  var waBtn = document.getElementById('sendWhatsapp');
  if(waBtn){
    waBtn.addEventListener('click', function(e){
      if(bookingForm && !bookingForm.reportValidity()){ e.preventDefault(); return; }
      var text = encodeURIComponent(buildMessage());
      waBtn.href = 'https://wa.me/31630036888?text=' + text;
    });
  }

  var emailBtn = document.getElementById('sendEmail');
  if(emailBtn){
    emailBtn.addEventListener('click', function(e){
      if(bookingForm && !bookingForm.reportValidity()){ e.preventDefault(); return; }
      var subject = encodeURIComponent('Fork It reservation — ' + (eventSelect.value || ''));
      var body = encodeURIComponent(buildMessage());
      emailBtn.href = 'mailto:Bookings@forkit.nl?subject=' + subject + '&body=' + body;
    });
  }

  var reviewBtn = document.getElementById('reviewBtn');
  if(reviewBtn){
    reviewBtn.addEventListener('click', function(e){
      e.preventDefault();
      var name = window.prompt('Your name:');
      if(name === null) return;
      var review = window.prompt('Tell us about your Fork It experience:');
      if(review === null || !review.trim()) return;
      var text = encodeURIComponent('Hi Fork It! Here\'s my review:\n\nName: ' + (name || 'Anonymous') + '\nReview: ' + review.trim());
      window.open('https://wa.me/31630036888?text=' + text, '_blank');
    });
  }
})();

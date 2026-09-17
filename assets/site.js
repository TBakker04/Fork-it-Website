(function(){
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---------- gate page: fade the scroll hint once the visitor starts scrolling ---------- */
  var scrollHint = document.getElementById('gateScrollHint');
  if(scrollHint){
    window.addEventListener('scroll', function(){
      scrollHint.classList.toggle('is-hidden', window.scrollY > 40);
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

  var waBtn = document.getElementById('sendWhatsapp');
  if(waBtn){
    waBtn.addEventListener('click', function(){
      var text = encodeURIComponent(buildMessage());
      waBtn.href = 'https://wa.me/31630036888?text=' + text;
    });
  }

  var emailBtn = document.getElementById('sendEmail');
  if(emailBtn){
    emailBtn.addEventListener('click', function(){
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

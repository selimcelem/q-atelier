/* ── Booking logic ─────────────────────────────────────── */
(() => {
  const API = window.API_ENDPOINT;
  const MONTHS_NL = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
  ];

  // Day-specific slots: 0=Sun, 1=Mon, ..., 6=Sat
  const SLOTS_BY_DAY = {
    0: [],                                                    // Zondag: gesloten
    1: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'], // Maandag
    2: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'], // Dinsdag
    3: [],                                                    // Woensdag: gesloten
    4: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'], // Donderdag
    5: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'], // Vrijdag
    6: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'], // Zaterdag
  };

  let currentYear, currentMonth; // 1-indexed month
  let slotsData = {};
  let selectedDate = null;
  let selectedSlot = null;

  const calendarTitle = document.getElementById('calendarTitle');
  const calendarGrid = document.getElementById('calendarGrid');
  const calendarLoading = document.getElementById('calendarLoading');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const timeslotsContainer = document.getElementById('timeslotsContainer');
  const timeslotsTitle = document.getElementById('timeslotsTitle');
  const timeslotsGrid = document.getElementById('timeslotsGrid');
  const formContainer = document.getElementById('bookingFormContainer');
  const formTitle = document.getElementById('bookingFormTitle');
  const bookingForm = document.getElementById('bookingForm');
  const bookingMessage = document.getElementById('bookingMessage');

  function getAmsterdamNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
  }

  function getAmsterdamHour() {
    return getAmsterdamNow().getHours();
  }

  function getAmsterdamMinutes() {
    return getAmsterdamNow().getMinutes();
  }

  function init() {
    const now = getAmsterdamNow();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
    bookingForm.addEventListener('submit', handleSubmit);
    loadMonth();
  }

  function navigate(dir) {
    currentMonth += dir;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    selectedDate = null;
    selectedSlot = null;
    timeslotsContainer.style.display = 'none';
    formContainer.style.display = 'none';
    bookingMessage.style.display = 'none';
    loadMonth();
  }

  async function loadMonth() {
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    calendarTitle.textContent = `${MONTHS_NL[currentMonth - 1]} ${currentYear}`;
    calendarGrid.innerHTML = '';
    calendarLoading.style.display = 'block';

    // Don't allow navigating to months before current
    const now = getAmsterdamNow();
    prevBtn.disabled = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

    try {
      const res = await fetch(`${API}/slots?month=${monthStr}`);
      if (!res.ok) throw new Error('Fout bij laden');
      slotsData = await res.json();
    } catch (e) {
      slotsData = {};
      console.error('Fout bij laden slots:', e);
    }

    calendarLoading.style.display = 'none';
    renderCalendar();
  }

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const now = getAmsterdamNow();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(currentYear, currentMonth - 1, day).getDay();
      const isClosed = dayOfWeek === 0 || dayOfWeek === 3; // Sunday or Wednesday
      const isPast = dateStr < today;

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'cal-day';
      el.textContent = day;

      if (isClosed) {
        el.classList.add('closed');
      } else if (isPast) {
        el.classList.add('past');
      } else {
        const daySlots = slotsData[dateStr];
        if (daySlots) {
          const availableCount = Object.values(daySlots).filter(s => s === 'available').length;
          if (availableCount > 0) {
            el.classList.add('has-slots');
            el.addEventListener('click', () => selectDate(dateStr));
          } else {
            el.classList.add('fully-booked');
          }
        } else {
          el.classList.add('has-slots');
          el.addEventListener('click', () => selectDate(dateStr));
        }
      }

      if (dateStr === selectedDate) el.classList.add('selected');
      calendarGrid.appendChild(el);
    }
  }

  function selectDate(dateStr) {
    selectedDate = dateStr;
    selectedSlot = null;
    formContainer.style.display = 'none';
    bookingMessage.style.display = 'none';

    renderCalendar();

    const parts = dateStr.split('-');
    const dayNum = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    timeslotsTitle.textContent = `${dayNum} ${MONTHS_NL[monthIdx]} ${parts[0]}`;
    timeslotsGrid.innerHTML = '';

    const dayOfWeek = new Date(parseInt(parts[0]), monthIdx, dayNum).getDay();
    const allSlots = SLOTS_BY_DAY[dayOfWeek] || [];
    const daySlots = slotsData[dateStr] || {};

    const now = getAmsterdamNow();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const currentHour = getAmsterdamHour();
    const currentMinutes = getAmsterdamMinutes();

    allSlots.forEach(slot => {
      const status = daySlots[slot] || 'available';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = slot;

      // Check if slot is in the past for today
      if (isToday) {
        const [slotH, slotM] = slot.split(':').map(Number);
        if (slotH < currentHour || (slotH === currentHour && slotM <= currentMinutes)) {
          btn.classList.add('past-slot');
          timeslotsGrid.appendChild(btn);
          return;
        }
      }

      btn.classList.add(status);
      if (status === 'available') {
        btn.addEventListener('click', () => selectSlot(dateStr, slot));
      }
      timeslotsGrid.appendChild(btn);
    });

    timeslotsContainer.style.display = 'block';
    timeslotsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function selectSlot(dateStr, slot) {
    selectedSlot = slot;
    bookingMessage.style.display = 'none';

    timeslotsGrid.querySelectorAll('.slot-btn.available').forEach(btn => {
      btn.classList.toggle('selected', btn.textContent === slot);
    });

    const parts = dateStr.split('-');
    const dayNum = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    formTitle.textContent = `${dayNum} ${MONTHS_NL[monthIdx]} ${parts[0]} om ${slot}`;
    formContainer.style.display = 'block';
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const submitBtn = bookingForm.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Bezig met boeken...';
    bookingMessage.style.display = 'none';

    const data = {
      name: document.getElementById('fieldName').value.trim(),
      email: document.getElementById('fieldEmail').value.trim(),
      phone: document.getElementById('fieldPhone').value.trim(),
      date: selectedDate,
      time_slot: selectedSlot,
      service: document.getElementById('fieldService').value,
    };

    try {
      const res = await fetch(`${API}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        showMessage('success', 'Bedankt voor uw aanvraag! Wij bevestigen uw afspraak zo snel mogelijk per e-mail.');
        bookingForm.reset();
        formContainer.style.display = 'none';
        timeslotsContainer.style.display = 'none';
        selectedDate = null;
        selectedSlot = null;
        loadMonth();
      } else if (res.status === 409) {
        showMessage('error', 'Dit tijdstip is helaas al bezet. Kies een ander tijdstip.');
      } else {
        const body = await res.json().catch(() => ({}));
        showMessage('error', body.error || 'Er ging iets mis. Probeer het opnieuw.');
      }
    } catch (err) {
      showMessage('error', 'Verbindingsfout. Controleer je internet en probeer het opnieuw.');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Afspraak bevestigen';
  }

  function showMessage(type, text) {
    bookingMessage.className = `booking-message ${type}`;
    bookingMessage.textContent = text;
    bookingMessage.style.display = 'block';
    bookingMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  init();
})();

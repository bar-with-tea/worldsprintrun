document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const game = document.getElementById('game');
  const countryInput = document.getElementById('country');
  const leaderboard = document.getElementById('leaderboard');
  const runner = document.getElementById('runner');
  const runnerImg = document.getElementById('runnerImg');
  const selectedCountryDiv = document.getElementById('selectedCountry');
  const speedDisplay = document.getElementById('speedDisplay');
  const breathingBar = document.getElementById('breathingBar');
  const marker = document.querySelector('.breathing-bar-marker');
  const countryLabel = document.querySelector('label[for="country"]');

  let speedHistory = [];
  const maxSpeedSamples = 20;
  let lastSpeedCheckTime = 0;
  let lastSpeedCheckDistance = 0;
  let markerPosition = 50;

  countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    countryInput.appendChild(opt);
  });

  let distance = 0;
  let running = false;
  let startTime = 0;
  let endTime = 0;
  let lastKey = '';
  let lastPressTime = 0;
  let scores = [];
  let timerInterval;
  let hurdles = [];
  let jumpReady = false;

  let runnerFrame = 0;
  let runnerAnimationInterval;
  let animationTimeout;

  function generateHurdles() {
    hurdles = [];
    let pos = 10 + Math.random() * 10;
    while (pos < 90) {
      hurdles.push(parseFloat(pos.toFixed(1)));
      pos += 10 + Math.random() * 10;
    }
  }

  function drawHurdles() {
    document.querySelectorAll('.hurdle').forEach(h => h.remove());
    const track = document.querySelector('.relative');
    hurdles.forEach(h => {
      const el = document.createElement('div');
      el.className = 'hurdle';
      el.style.left = `${(h / 100) * 100}%`;

      const img = document.createElement('img');
      img.src = 'pictures/hurdle_v1_1.png';
      img.alt = 'Hurdle';
      img.width = 80;
      img.height = 80;

      el.appendChild(img);
      track.appendChild(el);
    });
  }

  function isNearHurdle(d) {
    return hurdles.some(h => Math.abs(h - d) <= 1 && h > d);
  }

  function startRunnerAnimation() {
    if (runnerAnimationInterval) return;
    runnerAnimationInterval = setInterval(() => {
      runnerFrame = (runnerFrame + 1) % 2;
      runnerImg.src = `pictures/runner_v1_${runnerFrame + 2}.png`;
    }, 100);
  }

  function stopRunnerAnimation() {
    clearInterval(runnerAnimationInterval);
    runnerAnimationInterval = null;
    runnerImg.src = 'pictures/runner_v1_1.png';
  }

  function resetIdleAnimationTimeout() {
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
      stopRunnerAnimation();
    }, 300);
  }

  function updateMarkerPosition(delta) {
    markerPosition += delta;
    markerPosition = Math.max(0, Math.min(100, markerPosition));
    marker.style.left = `${markerPosition}%`;
  }

  function updateSpeed() {
    if (!running) return;

    const now = performance.now();
    const deltaTime = (now - lastSpeedCheckTime) / 1000;

    if (deltaTime > 0.1) {
      const deltaDistance = distance - lastSpeedCheckDistance;
      const rawSpeed = deltaDistance / deltaTime;

      if (isFinite(rawSpeed) && rawSpeed >= 0) {
        speedHistory.push(rawSpeed);
        if (speedHistory.length > maxSpeedSamples) {
          speedHistory.shift();
        }

        const avgSpeed = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
        speedDisplay.textContent = `${avgSpeed.toFixed(2)} m/s`;

        breathingBar.style.width = `${Math.min(100, avgSpeed * 10)}%`;

        if (avgSpeed > 3) {
          const shiftLeft = (avgSpeed - 3) * 0.5;
          updateMarkerPosition(-shiftLeft);
        }
      }

      lastSpeedCheckTime = now;
      lastSpeedCheckDistance = distance;
    }

    requestAnimationFrame(updateSpeed);
  }

  function updateLeaderboard() {
    leaderboard.innerHTML = '';
    scores.sort((a, b) => a.time - b.time);
    scores.slice(0, 10).forEach((score, index) => {
      const selected = countries.find(c => c.name === score.country);
      const li = document.createElement('li');
      let trophy = '';
      if (index === 0) trophy = '🥇';
      else if (index === 1) trophy = '🥈';
      else if (index === 2) trophy = '🥉';
      li.innerHTML = `
        <img src="${selected ? selected.flag : ''}" alt="${score.country} flag" class="inline-block w-5 h-4 object-cover mr-1 rounded">
        ${score.country} — ${score.time.toFixed(2)}s  ${trophy} 
      `;
      leaderboard.appendChild(li);
    });
  }

  function resetGameUI() {
    game.classList.add('hidden');
    startBtn.textContent = '🏁 Start Running!';
    startBtn.classList.remove('bg-yellow-300', 'text-black');
    startBtn.classList.add('bg-blue-600', 'text-white');
    countryInput.parentElement.classList.remove('hidden');
    selectedCountryDiv.innerHTML = '';
	bgMusic.pause();
	bgMusic.currentTime = 0;
  }

  startBtn.addEventListener('click', () => {
    const isRestarting = startBtn.textContent.includes('🔁 Restart');

	const bgMusic = document.getElementById('bgMusic');
	bgMusic.volume = 0.3;
	bgMusic.play().catch(e => {
		console.log('Autoplay blocked:', e);
	});
	
    if (isRestarting) {
      resetGameUI();
      return;
    }

    const countryName = countryInput.value.trim();
    if (!countryName) {
      alert('Please select your country.');
      return;
    }

    const selected = countries.find(c => c.name === countryName);
    if (selected) {
      selectedCountryDiv.innerHTML = `
        <img src="${selected.flag}" alt="${selected.name} flag" class="inline-block w-8 h-6 object-cover mr-2 rounded">
        <span class="font-semibold">${selected.name}</span>
      `;
    }

    countryInput.parentElement.classList.add('hidden');
    startBtn.textContent = '🔁 Restart';
    startBtn.classList.remove('bg-blue-600', 'text-white');
    startBtn.classList.add('bg-yellow-300', 'text-black');

    distance = 0;
    document.getElementById('time').textContent = '00:00';
    runner.style.left = `${(distance / 100) * 100}%`;
    runnerImg.src = 'pictures/runner_v1_1.png';
    game.classList.remove('hidden');
    running = true;
    lastKey = '';
    lastPressTime = 0;
    startTime = Date.now();
    jumpReady = false;

    speedHistory = [];
    lastSpeedCheckTime = performance.now();
    lastSpeedCheckDistance = 0;
    speedDisplay.textContent = '0.00 m/s';
    markerPosition = 50;
    marker.style.left = '50%';
    breathingBar.style.width = '0%';
    requestAnimationFrame(updateSpeed);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (running) {
        const now = Date.now();
        const elapsed = now - startTime;
        const seconds = Math.floor(elapsed / 1000);
        const hundredths = Math.floor((elapsed % 1000) / 10);
        document.getElementById('time').textContent = `${seconds.toString().padStart(2, '0')}:${hundredths.toString().padStart(2, '0')}`;
      }
    }, 50);
  });

  document.addEventListener('keydown', (e) => {
    if (!running) return;
    const now = Date.now();

    if (isNearHurdle(distance)) {
      jumpReady = true;
      if (e.key.toLowerCase() === 'j') {
        distance += 1;
      } else {
        return;
      }
    }

    if ((e.key === 'w' && lastKey === 's') || (e.key === 's' && lastKey === 'w')) {
      if (isNearHurdle(distance) && !jumpReady) return;

      // Calculate speed modifier based on breathing zone
      let paceModifier = 1;
      if (markerPosition < 30 || markerPosition > 70) {
        paceModifier = 0.5; // RED zone — slower
      }

      distance += 0.7 * paceModifier;
      jumpReady = false;

      startRunnerAnimation();
      resetIdleAnimationTimeout();

      runner.style.left = `${(distance / 110) * 100}%`;

      if (distance >= 100) {
        running = false;
        endTime = now;
        clearInterval(timerInterval);
        stopRunnerAnimation();
        const timeTaken = (endTime - startTime) / 1000;
        document.getElementById('time').textContent = timeTaken.toFixed(2);
        scores.push({ country: countryInput.value.trim(), time: timeTaken });
        updateLeaderboard();
        startBtn.classList.add('glow');
      }
    }

    if (e.key.toLowerCase() === 'b') {
      updateMarkerPosition(3);
    }

    lastKey = e.key;
    lastPressTime = now;
  });
});

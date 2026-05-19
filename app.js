let audioCtx;
let oscillator;
let gainNode;
let analyser;
let isPlaying = false;
let isMuted = false;

const playBtn = document.getElementById('play-btn');
const muteBtn = document.getElementById('mute-btn');
const waveformSelect = document.getElementById('waveform-select');
const frequencySlider = document.getElementById('frequency-slider');
const frequencyInput = document.getElementById('frequency-input');
const volumeSlider = document.getElementById('volume-slider');

const oscCanvas = document.getElementById('oscilloscope-canvas');
const specCanvas = document.getElementById('spectrum-canvas');
const oscCtx = oscCanvas.getContext('2d');
const specCtx = specCanvas.getContext('2d');

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();

    analyser.fftSize = 2048;

    oscillator.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    oscillator.type = waveformSelect.value;
    oscillator.frequency.setValueAtTime(frequencySlider.value, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volumeSlider.value, audioCtx.currentTime);

    oscillator.start();
}

function drawOscilloscope() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        oscCtx.fillStyle = '#090d16';
        oscCtx.fillRect(0, 0, oscCanvas.width, oscCanvas.height);

        oscCtx.lineWidth = 2;
        oscCtx.strokeStyle = '#38bdf8';
        oscCtx.beginPath();

        const sliceWidth = oscCanvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * oscCanvas.height / 2;

            if (i === 0) {
                oscCtx.moveTo(x, y);
            } else {
                oscCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        oscCtx.lineTo(oscCanvas.width, oscCanvas.height / 2);
        oscCtx.stroke();
    }
    draw();
}

function drawSpectrum() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        specCtx.fillStyle = '#090d16';
        specCtx.fillRect(0, 0, specCanvas.width, specCanvas.height);

        const barWidth = (specCanvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;

            specCtx.fillStyle = `rgb(56, 189, ${barHeight + 100})`;
            specCtx.fillRect(x, specCanvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }
    draw();
}

playBtn.addEventListener('click', () => {
    if (!audioCtx) {
        initAudio();
        drawOscilloscope();
        drawSpectrum();
    }

    if (!isPlaying) {
        audioCtx.resume();
        playBtn.textContent = 'Pause';
        isPlaying = true;
    } else {
        audioCtx.suspend();
        playBtn.textContent = 'Play';
        isPlaying = false;
    }
});

muteBtn.addEventListener('click', () => {
    if (!gainNode) return;

    if (!isMuted) {
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        muteBtn.textContent = 'Unmute';
        isMuted = true;
    } else {
        gainNode.gain.setValueAtTime(volumeSlider.value, audioCtx.currentTime);
        muteBtn.textContent = 'Mute';
        isMuted = false;
    }
});

waveformSelect.addEventListener('change', (e) => {
    if (oscillator) {
        oscillator.type = e.target.value;
    }
});

frequencySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    frequencyInput.value = value;
    if (oscillator) {
        oscillator.frequency.setValueAtTime(value, audioCtx.currentTime);
    }
});

frequencyInput.addEventListener('input', (e) => {
    const value = e.target.value;
    frequencySlider.value = value;
    if (oscillator) {
        oscillator.frequency.setValueAtTime(value, audioCtx.currentTime);
    }
});

volumeSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    if (gainNode && !isMuted) {
        gainNode.gain.setValueAtTime(value, audioCtx.currentTime);
    }
});

// Preset buttons
const freqPresets = document.querySelectorAll('.freq-preset');
const volPresets = document.querySelectorAll('.vol-preset');

freqPresets.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = parseFloat(btn.dataset.value);
        frequencySlider.value = value;
        frequencyInput.value = value;
        if (oscillator) {
            oscillator.frequency.setValueAtTime(value, audioCtx.currentTime);
        }
    });
});

function dbToLinear(db) {
    return Math.pow(10, db / 20);
}

volPresets.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        let linearVolume;

        if (value === 'silence') {
            linearVolume = 0;
        } else {
            linearVolume = dbToLinear(parseFloat(value));
        }

        volumeSlider.value = linearVolume;
        
        if (gainNode && !isMuted) {
            gainNode.gain.setValueAtTime(linearVolume, audioCtx.currentTime);
        }
    });
});

function resizeCanvas() {
    oscCanvas.width = oscCanvas.clientWidth;
    oscCanvas.height = oscCanvas.clientHeight;
    specCanvas.width = specCanvas.clientWidth;
    specCanvas.height = specCanvas.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

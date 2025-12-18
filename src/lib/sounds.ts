// Simple notification sound using Web Audio API
export const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant "ding" sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant notification frequency
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.type = 'sine';
    
    // Fade in and out for smooth sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

// Success/celebration sound (two tones)
export const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First tone
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0, audioContext.currentTime);
    gain1.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.15);
    
    // Second tone (higher)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.15);
    gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.35);
    osc2.start(audioContext.currentTime + 0.1);
    osc2.stop(audioContext.currentTime + 0.35);
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

// Pet added celebration sound (cheerful melody)
export const playPetAddedSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - major chord arpeggio
    
    notes.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      const startTime = audioContext.currentTime + (index * 0.08);
      osc.frequency.setValueAtTime(freq, startTime);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.25);
      
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

// Add to cart sound (cash register / coin drop)
export const playAddToCartSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a "ka-ching" cash register sound
    const notes = [1318.51, 1567.98]; // E6, G6 - high pitched coins
    
    notes.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      const startTime = audioContext.currentTime + (index * 0.06);
      osc.frequency.setValueAtTime(freq, startTime);
      osc.type = 'triangle';
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
    
    // Add a subtle low "thunk" for weight
    const bassOsc = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bassOsc.connect(bassGain);
    bassGain.connect(audioContext.destination);
    bassOsc.frequency.setValueAtTime(200, audioContext.currentTime);
    bassOsc.type = 'sine';
    bassGain.gain.setValueAtTime(0, audioContext.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
    bassGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    bassOsc.start(audioContext.currentTime);
    bassOsc.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

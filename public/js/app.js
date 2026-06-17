if (document.body.classList.contains('landing-body')) {
  const errorEl = document.getElementById('errorMsg');

  const createBtn = document.getElementById('createRoomBtn');
  const joinBtn = document.getElementById('joinRoomBtn');
  const roomCodeInput = document.getElementById('roomCodeInput');
  const hostNameInput = document.getElementById('hostName');
  const joinNameInput = document.getElementById('joinName');
  const hostPasswordInput = document.getElementById('hostPassword');
  const joinPasswordInput = document.getElementById('joinPassword');
  const toggleHostPwd = document.getElementById('toggleHostPwd');
  const toggleJoinPwd = document.getElementById('toggleJoinPwd');

  function togglePasswordVisibility(input, btn) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  toggleHostPwd.addEventListener('click', () => {
    togglePasswordVisibility(hostPasswordInput, toggleHostPwd);
  });

  toggleJoinPwd.addEventListener('click', () => {
    togglePasswordVisibility(joinPasswordInput, toggleJoinPwd);
  });

  createBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    const name = hostNameInput.value.trim();
    const password = hostPasswordInput.value;
    try {
      await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false
      });
      sessionStorage.setItem('userName', name || '');
      sessionStorage.setItem('mode', 'host');
      sessionStorage.setItem('roomPassword', password || '');
      window.location.href = '/room.html';
    } catch (err) {
      errorEl.textContent = '需要授权屏幕捕获才能创建房间';
    }
  });

  joinBtn.addEventListener('click', () => {
    errorEl.textContent = '';
    const name = joinNameInput.value.trim();
    const code = roomCodeInput.value.trim();
    const password = joinPasswordInput.value;
    if (!/^\d{6}$/.test(code)) {
      errorEl.textContent = '请输入6位数字房间码';
      return;
    }
    sessionStorage.setItem('userName', name || '');
    sessionStorage.setItem('mode', 'viewer');
    sessionStorage.setItem('roomCode', code);
    sessionStorage.setItem('roomPassword', password || '');
    window.location.href = '/room.html';
  });

  roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });
}

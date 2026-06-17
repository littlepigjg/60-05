(async function () {
  const mode = sessionStorage.getItem('mode');
  const savedName = sessionStorage.getItem('userName') || '';
  const savedRoomCode = sessionStorage.getItem('roomCode');
  const savedPassword = sessionStorage.getItem('roomPassword') || '';

  if (!mode || (mode === 'viewer' && !savedRoomCode)) {
    location.href = '/';
    return;
  }

  const $ = Utils.$;
  const $$ = Utils.$$;

  const roleTag = $('#roleTag');
  const connStatus = $('#connStatus');
  const roomBadge = $('#roomBadge');
  const roomCodeText = $('#roomCodeText');
  const waitTitle = $('#waitTitle');
  const waitSubtitle = $('#waitSubtitle');
  const waitingScreen = $('#waitingScreen');
  const videoPlayer = $('#videoPlayer');
  const annotCanvas = $('#annotCanvas');
  const partList = $('#partList');
  const partCount = $('#partCount');
  const audioBtn = $('#audioBtn');
  const leaveBtn = $('#leaveBtn');
  const passwordBtn = $('#passwordBtn');
  const passwordBadge = $('#passwordBadge');
  const passwordModal = $('#passwordModal');
  const passwordModalTitle = $('#passwordModalTitle');
  const passwordModalClose = $('#passwordModalClose');
  const newPasswordInput = $('#newPasswordInput');
  const confirmPasswordInput = $('#confirmPasswordInput');
  const passwordInputLabel = $('#passwordInputLabel');
  const passwordError = $('#passwordError');
  const toggleNewPwd = $('#toggleNewPwd');
  const toggleConfirmPwd = $('#toggleConfirmPwd');
  const savePasswordBtn = $('#savePasswordBtn');
  const cancelPasswordBtn = $('#cancelPasswordBtn');
  const clearPasswordBtn = $('#clearPasswordBtn');

  let roomHasPassword = false;

  roleTag.textContent = mode === 'host' ? '主持人' : '观看者';
  roleTag.className = 'role-tag ' + (mode === 'host' ? 'host' : 'viewer');

  const signaling = new SignalingClient();
  let webrtc = null;
  let annotation = null;
  let roomInfo = null;

  const userName = savedName || (mode === 'host' ? '主持人' : '观众') + Math.floor(Math.random() * 1000);

  try {
    await signaling.connect();
    signaling.setName(userName);
    connStatus.style.background = '#10b981';
    connStatus.textContent = '已连接';
  } catch (e) {
    connStatus.style.background = '#dc2626';
    connStatus.textContent = '连接失败';
    UI.toast('信令服务器连接失败');
    return;
  }

  annotation = new AnnotationManager(annotCanvas, signaling);
  setupAnnotationTools(annotation);

  webrtc = new WebRTCManager(signaling, signaling.clientId);
  webrtc.onStreamAdded = (peerId, stream) => {
    if (mode === 'viewer') {
      videoPlayer.srcObject = stream;
      waitingScreen.style.display = 'none';
      scheduleResize();
    }
  };
  webrtc.onStreamRemoved = (peerId) => {
    if (mode === 'viewer' && videoPlayer.srcObject) {
      const tracks = videoPlayer.srcObject.getVideoTracks();
      if (!tracks.length || tracks[0].readyState === 'ended') {
        videoPlayer.srcObject = null;
      }
    }
  };
  webrtc.emitStreamEnded = () => {
    if (mode === 'host') {
      UI.toast('屏幕共享已停止，正在重新请求...');
      location.reload();
    }
  };

  roomBadge.addEventListener('click', () => {
    if (signaling.roomCode) {
      UI.copyText(signaling.roomCode);
    }
  });

  function togglePasswordVisibility(input, btn) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  function openPasswordModal() {
    passwordError.textContent = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    newPasswordInput.type = 'password';
    confirmPasswordInput.type = 'password';
    toggleNewPwd.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    toggleConfirmPwd.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

    if (roomHasPassword) {
      passwordModalTitle.textContent = '修改房间密码';
      passwordInputLabel.textContent = '新密码';
      clearPasswordBtn.style.display = 'inline-block';
    } else {
      passwordModalTitle.textContent = '设置房间密码';
      passwordInputLabel.textContent = '设置密码';
      clearPasswordBtn.style.display = 'none';
    }

    passwordModal.style.display = 'flex';
    setTimeout(() => newPasswordInput.focus(), 100);
  }

  function closePasswordModal() {
    passwordModal.style.display = 'none';
  }

  function updatePasswordBadge(hasPassword) {
    roomHasPassword = hasPassword;
    if (hasPassword) {
      passwordBadge.style.display = 'inline-flex';
    } else {
      passwordBadge.style.display = 'none';
    }
  }

  toggleNewPwd.addEventListener('click', () => {
    togglePasswordVisibility(newPasswordInput, toggleNewPwd);
  });

  toggleConfirmPwd.addEventListener('click', () => {
    togglePasswordVisibility(confirmPasswordInput, toggleConfirmPwd);
  });

  passwordBtn.addEventListener('click', openPasswordModal);
  passwordModalClose.addEventListener('click', closePasswordModal);
  cancelPasswordBtn.addEventListener('click', closePasswordModal);

  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
      closePasswordModal();
    }
  });

  savePasswordBtn.addEventListener('click', () => {
    const pwd = newPasswordInput.value;
    const confirmPwd = confirmPasswordInput.value;

    if (!pwd) {
      passwordError.textContent = '请输入密码';
      return;
    }
    if (pwd.length < 1) {
      passwordError.textContent = '密码不能为空';
      return;
    }
    if (pwd !== confirmPwd) {
      passwordError.textContent = '两次输入的密码不一致';
      return;
    }

    passwordError.textContent = '';
    signaling.setPassword(pwd);
  });

  clearPasswordBtn.addEventListener('click', () => {
    if (confirm('确定要取消密码保护吗？取消后任何人都可以通过房间码加入房间。')) {
      signaling.clearPassword();
    }
  });

  audioBtn.addEventListener('click', async () => {
    const enabled = await webrtc.toggleAudio();
    audioBtn.classList.toggle('active', enabled);
    audioBtn.querySelector('span').textContent = enabled ? '麦克风开' : '麦克风';
    UI.toast(enabled ? '麦克风已开启' : '麦克风已关闭');
  });

  leaveBtn.addEventListener('click', () => {
    if (confirm('确定要离开房间吗？')) {
      cleanup();
      location.href = '/';
    }
  });

  signaling.on('room-created', (msg) => {
    signaling.roomCode = msg.roomCode;
    roomCodeText.textContent = msg.roomCode;
    updatePasswordBadge(msg.hasPassword || false);
    passwordBtn.style.display = 'inline-flex';
    UI.toast('房间创建成功，房间码: ' + msg.roomCode);
  });

  signaling.on('room-joined', (msg) => {
    signaling.roomCode = msg.roomCode;
    roomCodeText.textContent = msg.roomCode;
    updatePasswordBadge(msg.hasPassword || false);
    if (msg.annotations && msg.annotations.length) {
      annotation.loadInitial(msg.annotations);
    }
    UI.toast('已加入房间');
    setTimeout(() => {
      signaling.requestOffer(msg.hostId);
    }, 400);
  });

  signaling.on('join-error', (msg) => {
    UI.toast(msg.message || '加入房间失败');
    waitTitle.textContent = '加入失败';
    waitSubtitle.textContent = msg.message || '请检查房间码和密码';
    connStatus.style.background = '#dc2626';
    connStatus.textContent = '验证失败';
  });

  signaling.on('password-set', (msg) => {
    if (msg.success) {
      UI.toast('密码设置成功');
      closePasswordModal();
    }
  });

  signaling.on('password-cleared', (msg) => {
    if (msg.success) {
      UI.toast('已取消密码保护，房间变为公开');
      closePasswordModal();
    }
  });

  signaling.on('room-info', (msg) => {
    roomInfo = msg.info;
    updatePasswordBadge(msg.info.hasPassword || false);
    renderParticipants(msg.info);
  });

  signaling.on('peer-joined', (msg) => {
    UI.toast(`${msg.name} 加入了房间`);
    if (mode === 'host') {
      setTimeout(() => webrtc.initiateConnection(msg.peerId), 300);
    }
  });

  signaling.on('peer-left', (msg) => {
    webrtc.removePeer(msg.peerId);
  });

  signaling.on('room-destroyed', () => {
    UI.toast('主持人已结束共享，房间已关闭');
    setTimeout(() => {
      cleanup();
      location.href = '/';
    }, 1500);
  });

  signaling.on('error', (msg) => {
    UI.toast(msg.message || '错误');
    if (msg.message === '房间不存在') {
      setTimeout(() => { location.href = '/'; }, 1500);
    }
  });

  signaling.on('signal', async (msg) => {
    const data = msg.data;
    if (data.type === 'offer') {
      await webrtc.handleOffer(msg.from, data.sdp);
    } else if (data.type === 'answer') {
      await webrtc.handleAnswer(msg.from, data.sdp);
    }
  });

  signaling.on('ice-candidate', (msg) => {
    webrtc.handleIceCandidate(msg.from, msg.candidate);
  });

  signaling.on('request-offer', (msg) => {
    if (mode === 'host') {
      webrtc.initiateConnection(msg.from);
    }
  });

  signaling.on('annotation', (msg) => {
    annotation.receiveAnnotation(msg.annotation);
  });

  signaling.on('clear-annotations', () => {
    annotation.annotations = [];
    annotation.render();
    UI.toast('标注已被清空');
  });

  signaling.on('disconnected', () => {
    connStatus.style.background = '#dc2626';
    connStatus.textContent = '已断开';
    UI.toast('与服务器连接断开');
  });

  function renderParticipants(info) {
    if (!info) return;
    partCount.textContent = info.clients.length;
    UI.renderParticipantList(partList, info.clients, signaling.clientId);
  }

  function setupAnnotationTools(ann) {
    $$('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        ann.setTool(btn.dataset.tool);
      });
    });
    $$('.color-swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        $$('.color-swatch').forEach((s) => s.classList.remove('active'));
        sw.classList.add('active');
        ann.setColor(sw.dataset.color);
      });
    });
    const strokeSlider = $('#strokeSlider');
    const strokeValue = $('#strokeValue');
    strokeSlider.addEventListener('input', () => {
      const v = parseInt(strokeSlider.value, 10);
      strokeValue.textContent = v;
      ann.setStroke(v);
    });
    $('#undoBtn').addEventListener('click', () => ann.undo());
    $('#clearBtn').addEventListener('click', () => {
      if (confirm('确定清空所有标注吗？')) ann.clearAll();
    });
  }

  const scheduleResize = Utils.debounce(() => {
    annotation._setupCanvas();
  }, 100);

  videoPlayer.addEventListener('loadedmetadata', scheduleResize);

  function cleanup() {
    try { signaling.leaveRoom(); } catch (e) { /* ignore */ }
    try { webrtc.destroy(); } catch (e) { /* ignore */ }
  }
  window.addEventListener('beforeunload', cleanup);

  if (mode === 'host') {
    waitTitle.textContent = '正在请求屏幕共享权限...';
    waitSubtitle.textContent = '请选择要共享的窗口或屏幕';
    passwordBtn.style.display = 'none';
    try {
      const stream = await webrtc.acquireDisplay();
      videoPlayer.srcObject = stream;
      waitingScreen.style.display = 'none';
      signaling.createRoom(savedPassword || null);
      scheduleResize();
    } catch (e) {
      waitTitle.textContent = '屏幕共享未授权';
      waitSubtitle.textContent = '请刷新页面并授权屏幕捕获';
      connStatus.style.background = '#dc2626';
      connStatus.textContent = '未授权';
      UI.toast('需要授权屏幕捕获才能继续');
    }
  } else {
    waitTitle.textContent = '正在加入房间...';
    waitSubtitle.textContent = '房间码: ' + savedRoomCode;
    signaling.joinRoom(savedRoomCode, savedPassword || '');
  }
})();

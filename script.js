document.addEventListener("DOMContentLoaded", () => {
    
    /* ==========================================
       0. SPLASH SCREEN & CORE MATH
    ========================================== */
    const splashScreen = document.getElementById('splashScreen');
    const splashTextContainer = document.getElementById('splashTextContainer');
    const mainAppContent = document.getElementById('mainAppContent');
    const mainDock = document.getElementById('mainDock');
    
    setTimeout(() => splashTextContainer.classList.remove('translate-y-4', 'opacity-0'), 800);

    setTimeout(() => {
        splashScreen.style.opacity = '0';
        splashScreen.style.pointerEvents = 'none';
        document.body.classList.remove('splash-active');
        mainAppContent.classList.remove('opacity-0');
        mainDock.classList.remove('opacity-0');
        setTimeout(() => splashScreen.remove(), 1000);
    }, 2500);

    const dateInput = document.getElementById('bookingDateInput');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    window.userHomeLat = 20.5937; // Default India Center
    window.userHomeLon = 78.9629;
    window.userContinent = "Asia";

    // Currency System
    window.currencyRates = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044 };
    window.currencySymbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ ' };
    window.userCurrency = localStorage.getItem('travique_currency') || 'INR';

    window.formatPrice = function(amountInr) {
        const rate = window.currencyRates[window.userCurrency] || 1;
        const sym = window.currencySymbols[window.userCurrency] || '₹';
        return sym + Math.round(amountInr * rate).toLocaleString('en-IN');
    };

    window.getDistance = function(lat1, lon1, lat2, lon2) {
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    window.executeHomeSearch = function(e) {
        if (e) e.preventDefault();
        const val = document.getElementById('homeSearchInput').value;
        window.routeToTab('tab-maps');
        setTimeout(() => {
            const mapInput = document.getElementById('mapSearchInput');
            mapInput.value = val;
            mapInput.focus();
            if(val) {
               const destIndex = window.destinations.findIndex(d => d.name.toLowerCase() === val.toLowerCase() || d.name.toLowerCase().includes(val.toLowerCase()));
               if(destIndex !== -1) {
                   window.flyToDestination(window.destinations[destIndex]);
               }
            }
        }, 300);
    }
    
    document.getElementById('homeSearchInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') window.executeHomeSearch();
    });

    /* ==========================================
       1. DRAGGABLE DOCK & ROUTING
    ========================================== */
    const dockItems = Array.from(document.querySelectorAll(".dock-item"));
    const navIndicator = document.getElementById("navIndicator");
    const bottomNav = document.getElementById("bottomNav");
    const appTabs = document.querySelectorAll(".app-tab");

    let isDragging = false, hasDragged = false, startX = 0, initialLeft = 0;

    function switchTab(item, skipScrollTop = false) {
      if(!item) return null;
      const targetId = item.getAttribute("data-target");

      const currentActive = document.querySelector(".app-tab:not(.hidden)");
      if (currentActive && currentActive.id === targetId && skipScrollTop) return targetId;
      
      const width = item.offsetWidth;
      const left = item.offsetLeft;
      navIndicator.style.width = `${width}px`;
      navIndicator.style.transform = `translateX(${left}px)`;

      dockItems.forEach(nav => {
        nav.classList.remove("text-slate-900", "scale-110");
        nav.classList.add("text-slate-500");
      });
      item.classList.remove("text-slate-500");
      item.classList.add("text-slate-900", "scale-110");

      appTabs.forEach(tab => tab.classList.add("hidden"));
      document.getElementById(targetId).classList.remove("hidden");
      
      if(!skipScrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });

      if(targetId === 'tab-maps') {
          setTimeout(() => {
              if(!window.mapInitialized && typeof L !== 'undefined') window.initLeafletMap();
              if(window.leafletMap) window.leafletMap.invalidateSize(true);
          }, 300);
      }
      return targetId;
    }

    function handleDragStart(e) {
      if(e.target.closest('.dock-item') || e.target === bottomNav) {
         isDragging = true; hasDragged = false;
         startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
         const style = window.getComputedStyle(navIndicator);
         const matrix = new WebKitCSSMatrix(style.transform);
         initialLeft = matrix.m41;
         navIndicator.style.transition = 'none';
      }
    }

    function handleDragMove(e) {
      if(!isDragging) return;
      hasDragged = true; 
      const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      let newLeft = initialLeft + (x - startX);
      const maxLeft = bottomNav.offsetWidth - navIndicator.offsetWidth - 8; 
      if(newLeft < 8) newLeft = 8;
      if(newLeft > maxLeft) newLeft = maxLeft;
      navIndicator.style.transform = `translateX(${newLeft}px)`;
      e.preventDefault(); 
    }

    function handleDragEnd() {
      if(!isDragging) return;
      isDragging = false;
      navIndicator.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      const indicatorRect = navIndicator.getBoundingClientRect();
      const indicatorCenter = indicatorRect.left + (indicatorRect.width / 2);
      
      let closestItem = dockItems[0];
      let minDistance = Infinity;
      dockItems.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const distance = Math.abs((itemRect.left + itemRect.width / 2) - indicatorCenter);
        if(distance < minDistance) { minDistance = distance; closestItem = item; }
      });
      switchTab(closestItem);
      setTimeout(() => { hasDragged = false; }, 50);
    }

    dockItems.forEach(item => {
      item.addEventListener("click", (e) => {
         if (hasDragged) { e.preventDefault(); return; }
         switchTab(item, false);
      });
    });

    bottomNav.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    bottomNav.addEventListener('touchstart', handleDragStart, {passive: false});
    window.addEventListener('touchmove', handleDragMove, {passive: false});
    window.addEventListener('touchend', handleDragEnd);

    setTimeout(() => switchTab(document.querySelector('.dock-item[data-target="tab-home"]')), 50);
    window.addEventListener('resize', () => {
      const active = document.querySelector(".dock-item.text-slate-900");
      if(active) { navIndicator.style.width = `${active.offsetWidth}px`; navIndicator.style.transform = `translateX(${active.offsetLeft}px)`; }
    });

    window.routeToTab = function(tabId, message, scrollToExplore = false) {
      const targetBtn = document.querySelector(`.dock-item[data-target="${tabId}"]`);
      if(targetBtn) switchTab(targetBtn, scrollToExplore);
      else {
          appTabs.forEach(tab => tab.classList.add("hidden"));
          const targetTab = document.getElementById(tabId);
          if(targetTab) targetTab.classList.remove("hidden");
          dockItems.forEach(nav => { nav.classList.remove("text-slate-900", "scale-110"); nav.classList.add("text-slate-500"); });
          const navInd = document.getElementById('navIndicator');
          if(navInd) navInd.style.width = '0px'; 
          if(!scrollToExplore) window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if(message) window.showNotification(message, 'info');
      if(window.closeOverlays) window.closeOverlays();
      
      if(tabId === 'tab-ai') setTimeout(() => { const aiInput = document.getElementById('aiInput'); if(aiInput) aiInput.focus(); }, 300);
      if(scrollToExplore && tabId === 'tab-home') {
          setTimeout(() => {
              const exploreSec = document.getElementById('exploreSection');
              if(exploreSec) window.scrollTo({top: exploreSec.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth'});
          }, 150);
      }
    }

    /* ==========================================
       2. UI OVERLAYS, MODALS
    ========================================== */
    window.hideModals = () => {
        ['legalModalContent', 'settingsModalContent', 'favoritesModalContent', 'supportModalContent', 'mapFilterModalContent', 'notificationsModalContent', 'paymentModalContent'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('translate-y-[120%]');
        });
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('-translate-x-full');
    };

    window.closeOverlays = () => {
        window.hideModals();
        const overlay = document.getElementById('overlay');
        if(overlay) overlay.classList.add('opacity-0');
        if(window.overlayTimeout) clearTimeout(window.overlayTimeout);
        window.overlayTimeout = setTimeout(() => {
            if(overlay) overlay.classList.add('hidden');
            ['legalModal', 'settingsModal', 'favoritesModal', 'supportModal', 'mapFilterModal', 'notificationsModal', 'paymentModal'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.classList.add('hidden');
            });
        }, 400);
    };

    window.openModal = (modalId, contentId) => {
        if(window.overlayTimeout) clearTimeout(window.overlayTimeout);
        window.hideModals();
        const modal = document.getElementById(modalId);
        const content = document.getElementById(contentId);
        const overlay = document.getElementById('overlay');
        modal.classList.remove('hidden'); overlay.classList.remove('hidden');
        void modal.offsetWidth; // Reflow
        overlay.classList.remove('opacity-0'); content.classList.remove('translate-y-[120%]');
    };

    document.getElementById('menuBtn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('-translate-x-full');
      document.getElementById('overlay').classList.remove('hidden');
      if(window.overlayTimeout) clearTimeout(window.overlayTimeout);
      setTimeout(() => document.getElementById('overlay').classList.remove('opacity-0'), 10);
    });
    
    document.getElementById('closeSidebarBtn').addEventListener('click', window.closeOverlays);
    document.getElementById('overlay').addEventListener('click', window.closeOverlays);
    document.getElementById('sidebarLoginBtn').addEventListener('click', () => { window.closeOverlays(); window.routeToTab('tab-profile'); });

    window.openNotificationsModal = function() {
        window.openModal('notificationsModal', 'notificationsModalContent');
        const notifBtn = document.querySelector('[aria-label="Notifications"]');
        if(notifBtn) notifBtn.querySelectorAll('span').forEach(span => span.style.display = 'none');
    };

    window.showNotification = function(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      let icon = 'fa-circle-info text-indigo-500';
      if (type === 'success') icon = 'fa-circle-check text-emerald-500';
      if (type === 'error') icon = 'fa-circle-xmark text-rose-500';

      toast.className = `flex items-center gap-4 px-6 py-4 rounded-[1.5rem] shadow-xl font-bold text-sm transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] translate-x-full liquid-glass`;
      toast.innerHTML = `<i class="fa-solid ${icon} text-2xl drop-shadow-sm"></i> <span class="tracking-tight">${message}</span>`;
      container.appendChild(toast);
      toast.offsetHeight; 
      toast.classList.remove('translate-x-full');
      setTimeout(() => { toast.classList.add('translate-x-full'); setTimeout(() => toast.remove(), 500); }, 3000);
    };

    window.openSettingsModal = function() {
      const user = JSON.parse(localStorage.getItem("travique_user"));
      if (!user) { window.showNotification("Please log in first", "error"); return; }
      
      document.getElementById('settingsName').value = user.name || "";
      document.getElementById('settingsEmail').value = user.email || "";
      document.getElementById('settingsSecEmail').value = user.secEmail || "";
      document.getElementById('settingsPhone').value = user.phone || "";
      document.getElementById('settingsSecPhone').value = user.secPhone || "";
      document.getElementById('settingsGender').value = user.gender || "Unspecified";
      document.getElementById('settingsAddress').value = user.address || "";
      document.getElementById('settingsCountry').value = user.country || "India";
      document.getElementById('settingsLanguage').value = user.language || "English";
      document.getElementById('settingsCurrency').value = window.userCurrency || "INR";

      window.openModal('settingsModal', 'settingsModalContent');
    };

    document.getElementById('settingsForm').addEventListener('submit', (e) => {
       e.preventDefault();
       let user = JSON.parse(localStorage.getItem("travique_user"));
       if (user) {
           user.name = document.getElementById('settingsName').value;
           user.secEmail = document.getElementById('settingsSecEmail').value;
           user.phone = document.getElementById('settingsPhone').value;
           user.secPhone = document.getElementById('settingsSecPhone').value;
           user.gender = document.getElementById('settingsGender').value;
           user.address = document.getElementById('settingsAddress').value;
           user.country = document.getElementById('settingsCountry').value;
           user.language = document.getElementById('settingsLanguage').value;
           
           window.userCurrency = document.getElementById('settingsCurrency').value;
           localStorage.setItem('travique_currency', window.userCurrency);

           localStorage.setItem("travique_user", JSON.stringify(user));
           let users = JSON.parse(localStorage.getItem('travique_db_users') || '[]');
           let dbUserIndex = users.findIndex(u => u.email === user.email);
           if(dbUserIndex !== -1) { users[dbUserIndex] = user; localStorage.setItem('travique_db_users', JSON.stringify(users)); }
           
           window.updateAuthState();
           window.renderDestinations(); // re-render to update prices
           if(activeMapDest) window.openMapPopup(activeMapDest);
           window.updateLivePrice();
           
           window.showNotification("Preferences saved successfully!", "success");
           window.closeOverlays();
       }
    });

    window.openSupportModal = function() {
      window.openModal('supportModal', 'supportModalContent');
    };

    document.getElementById('supportForm').addEventListener('submit', (e) => {
       e.preventDefault();
       const btn = e.target.querySelector('button[type="submit"]');
       const originalHTML = btn.innerHTML;
       btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
       btn.disabled = true;
       setTimeout(() => {
          btn.innerHTML = originalHTML; btn.disabled = false; e.target.reset(); window.closeOverlays();
          window.showNotification("Message sent! Our support team will email you within 24 hours.", "success");
       }, 1500);
    });

    document.getElementById('startLiveChatBtn').addEventListener('click', function() {
       const originalHTML = this.innerHTML;
       this.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting...`;
       this.disabled = true;
       setTimeout(() => {
          this.innerHTML = originalHTML; this.disabled = false;
          window.showNotification("All agents are currently busy. Please send us an email.", "error");
       }, 2500);
    });

    window.openLegalModal = function(type) {
      const legalModalTitle = document.getElementById('legalModalTitle');
      const legalModalBody = document.getElementById('legalModalBody');
      const legalDocuments = {
          terms: `<h3 class="text-lg font-bold text-slate-900">1. Introduction</h3><p>Welcome to Travique. By accessing our application and utilizing our premium travel booking services, you agree to be bound by these Terms and Conditions.</p><h3 class="text-lg font-bold text-slate-900 mt-4">2. Bookings and Payments</h3><p>All travel bookings are subject to availability. Prices displayed are dynamic and may change until the final checkout is completed. Your account/wallet will be charged immediately upon confirmation.</p>`,
          privacy: `<h3 class="text-lg font-bold text-slate-900">1. Information We Collect</h3><p>We collect information to provide better services to our users. This includes account details, booking history, and device information to optimize your app experience.</p><h3 class="text-lg font-bold text-slate-900 mt-4">2. Data Security</h3><p>We implement strict security measures. Your wallet balance and transaction history are encrypted in transit and at rest.</p>`
      };
      if (type === 'terms') { legalModalTitle.textContent = "Terms & Conditions"; legalModalBody.innerHTML = legalDocuments.terms; } 
      else if (type === 'privacy') { legalModalTitle.textContent = "Privacy Policy"; legalModalBody.innerHTML = legalDocuments.privacy; }
      window.openModal('legalModal', 'legalModalContent');
    };

    /* ==========================================
       3. FULL AUTHENTICATION & WALLET SYSTEM
    ========================================== */
    window.walletBalance = 0; // Stored in INR fundamentally

    window.updateWalletUI = function() {
      const uiBalance = document.getElementById("uiWalletBalance");
      const profileBalance = document.getElementById("uiProfileWallet");
      if (uiBalance) uiBalance.innerText = window.formatPrice(window.walletBalance);
      if (profileBalance) profileBalance.innerText = window.formatPrice(window.walletBalance);
      window.renderTxns();
    }

    window.renderTxns = function() {
      const txnList = document.getElementById("txnList");
      if(!txnList) return;
      let txns = JSON.parse(localStorage.getItem('travique_txns')||'[]');
      if (txns.length === 0) {
        txnList.innerHTML = `<div class="text-center py-6 opacity-40 text-sm font-bold">No recent transactions.</div>`;
        return;
      }
      txnList.innerHTML = txns.reverse().slice(0,5).map(txn => `
        <div class="flex items-center justify-between p-4 rounded-[1.2rem] hover:bg-black/5 transition-colors shadow-sm bg-white/40 border border-white/50">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full ${txn.type==='add' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'} flex items-center justify-center shadow-inner">
              <i class="fa-solid ${txn.type==='add' ? 'fa-arrow-down' : 'fa-plane'}"></i>
            </div>
            <div>
              <h4 class="font-black text-sm tracking-tight">${txn.title}</h4>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Just now</p>
            </div>
          </div>
          <span class="font-black ${txn.type==='add' ? 'text-emerald-500' : 'text-slate-900'}">${txn.type==='add'?'+':'-'}${window.formatPrice(Math.abs(txn.amount))}</span>
        </div>
      `).join("");
    }

    window.addTxn = function(title, amount, type) {
      let txns = JSON.parse(localStorage.getItem('travique_txns')||'[]');
      txns.push({title, amount, type, time: new Date().getTime()});
      localStorage.setItem('travique_txns', JSON.stringify(txns));
    }

    window.updateAuthState = function() {
      const user = JSON.parse(localStorage.getItem("travique_user"));
      if (user) {
        document.getElementById("authUnloggedState").classList.add("hidden");
        document.getElementById("authLoggedState").classList.remove("hidden");
        if(document.getElementById("profileNameDisplay")) document.getElementById("profileNameDisplay").textContent = user.name || "Traveller";
        if(document.getElementById("profileEmailDisplay")) document.getElementById("profileEmailDisplay").textContent = user.email || "";
        document.getElementById("sidebarLoginBtn").textContent = "My Profile";
        window.walletBalance = user.balance || 0; 
        window.updateWalletUI();
      } else {
        document.getElementById("authUnloggedState").classList.remove("hidden");
        document.getElementById("authLoggedState").classList.add("hidden");
        document.getElementById("sidebarLoginBtn").textContent = "Login / Sign In";
        window.walletBalance = 0; 
        window.updateWalletUI();
      }
    }

    window.processTopUp = function(method) {
      let user = JSON.parse(localStorage.getItem("travique_user"));
      if (!user) { window.showNotification("Please log in to add funds", "error"); window.routeToTab('tab-profile'); return; }
      
      window.closeOverlays();
      window.showNotification(`Processing ${method} payment via Secure Gateway...`, "info");
      
      setTimeout(() => {
        user.balance += 50000; // Adding 50k INR base
        let users = JSON.parse(localStorage.getItem('travique_db_users') || '[]');
        let dbUser = users.find(u => u.email === user.email);
        if(dbUser) dbUser.balance = user.balance;
        localStorage.setItem('travique_db_users', JSON.stringify(users));
        localStorage.setItem("travique_user", JSON.stringify(user));
        
        window.walletBalance = user.balance; 
        window.addTxn(`${method} Deposit`, 50000, "add");
        window.updateWalletUI();
        window.showNotification(`${window.formatPrice(50000)} added to Wallet!`, "success");
      }, 1500);
    }

    // Profile Auth Logic Handlers
    document.getElementById('tabSignInBtn').addEventListener('click', () => {
      document.getElementById('tabSignInBtn').className = "flex-1 py-3 rounded-[14px] font-bold bg-white shadow-sm text-slate-900 transition-colors";
      document.getElementById('tabSignUpBtn').className = "flex-1 py-3 rounded-[14px] font-bold text-slate-500 hover:text-slate-800 transition-colors";
      document.getElementById('signInForm').classList.remove('hidden');
      document.getElementById('signUpForm').classList.add('hidden');
    });
    
    document.getElementById('tabSignUpBtn').addEventListener('click', () => {
      document.getElementById('tabSignUpBtn').className = "flex-1 py-3 rounded-[14px] font-bold bg-white shadow-sm text-slate-900 transition-colors";
      document.getElementById('tabSignInBtn').className = "flex-1 py-3 rounded-[14px] font-bold text-slate-500 hover:text-slate-800 transition-colors";
      document.getElementById('signUpForm').classList.remove('hidden');
      document.getElementById('signInForm').classList.add('hidden');
    });

    document.getElementById('signUpForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signUpName').value;
      const email = document.getElementById('signUpEmail').value;
      const password = document.getElementById('signUpPassword').value;
      if (!document.getElementById('termsCheck').checked) return window.showNotification("Please agree to the Terms & Privacy Policy.", "error");
      
      let users = JSON.parse(localStorage.getItem('travique_db_users') || '[]');
      if (users.find(u => u.email === email)) return window.showNotification("Email already registered", "error");
      
      // Starts with 1.5 Lakhs INR base
      const newUser = { name, email, password, balance: 150000, phone: '', country: 'India', language: 'English' }; 
      users.push(newUser);
      localStorage.setItem('travique_db_users', JSON.stringify(users));
      localStorage.setItem('travique_user', JSON.stringify(newUser));
      window.showNotification("Account created!", "success");
      window.updateAuthState();
      e.target.reset();
    });

    document.getElementById('signInForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('signInEmail').value;
      const password = document.getElementById('signInPassword').value;
      
      let users = JSON.parse(localStorage.getItem('travique_db_users') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) return window.showNotification("Invalid email or password", "error");
      
      localStorage.setItem('travique_user', JSON.stringify(user));
      window.showNotification("Welcome back!", "success");
      window.updateAuthState();
      e.target.reset();
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("travique_user");
      window.updateAuthState(); 
      window.showNotification("Logged out successfully", "info");
    });

    window.updateAuthState(); // Call on load

    /* ==========================================
       4. INDIA-ONLY DATABASE WITH REAL IMAGES
    ========================================== */
    const emojiMap = { 'city':'🏙️', 'beach':'🏖️', 'mountain':'🏔️', 'history':'🏛️', 'hotel':'🏨', 'attraction':'📸', 'flight':'🛫', 'train':'🚆', 'romantic':'❤️' };

    const top25Places = ["Agra", "Jaipur", "New Delhi", "Mumbai", "Chennai", "Kolkata", "Bengaluru", "Goa", "Munnar", "Varanasi", "Darjeeling", "Shimla", "Udaipur", "Mysuru", "Kochi", "Madurai", "Ahmedabad", "Pune", "Puri", "Mahabaleshwar", "Manali", "Alleppey", "Ooty", "Jodhpur", "Rameshwaram"];

    const realPlaceImages = {
        "Chennai": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=600",
        "Bengaluru": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=600",
        "Mumbai": "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?q=80&w=600",
        "New Delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600",
        "Agra": "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=600",
        "Jaipur": "https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=600",
        "Varanasi": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=600",
        "Goa": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=600",
        "Munnar": "https://images.unsplash.com/photo-1605649487212-4d63256d0295?q=80&w=600",
        "Alleppey": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=600",
        "Ooty": "https://images.unsplash.com/photo-1593693397690-362bb9a11540?q=80&w=600",
        "Kochi": "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?q=80&w=600",
        "Madurai": "https://images.unsplash.com/photo-1600100397608-f010f41cb8ea?q=80&w=600",
        "Mysuru": "https://images.unsplash.com/photo-1600100397608-f010f41cb8ea?q=80&w=600",
        "Pune": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=600",
        "Mahabaleshwar": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=600",
        "Udaipur": "https://images.unsplash.com/photo-1615836245337-f589886a0735?q=80&w=600",
        "Jodhpur": "https://images.unsplash.com/photo-1599661559868-b71569cb2cc7?q=80&w=600",
        "Shimla": "https://images.unsplash.com/photo-1623880529598-67ed07590800?q=80&w=600",
        "Manali": "https://images.unsplash.com/photo-1605649487212-4d63256d0295?q=80&w=600",
        "Ahmedabad": "https://images.unsplash.com/photo-1595928642581-f50f4f3453a5?q=80&w=600",
        "Kolkata": "https://images.unsplash.com/photo-1558431382-27e303142255?q=80&w=600",
        "Darjeeling": "https://images.unsplash.com/photo-1625895197185-efc012119c85?q=80&w=600",
        "Puri": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=600",
        "Rameshwaram": "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=600",
        
        // Hubs specifically
        "DEL Indira Gandhi": "https://images.unsplash.com/photo-1544620347124-03c8947c8612?q=80&w=600",
        "BOM Chhatrapati Shivaji": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=600",
        "BLR Kempegowda Intl": "https://images.unsplash.com/photo-1503251472901-522197170a48?q=80&w=600",
        "MAA Chennai Intl": "https://images.unsplash.com/photo-1544620347124-03c8947c8612?q=80&w=600",
        "NDLS New Delhi Train": "https://images.unsplash.com/photo-1474487548417-7284482103f6?q=80&w=600",
        "CSMT Mumbai Train": "https://images.unsplash.com/photo-1541088924-dc795af060d4?q=80&w=600",
        "MAS Chennai Central": "https://images.unsplash.com/photo-1498114170363-d1ea21b2d35b?q=80&w=600",
    };

    const fallbackImages = {
        'city': ["https://images.unsplash.com/photo-1595928642581-f50f4f3453a5?q=80&w=600", "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=600", "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=600"],
        'beach': ["https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?q=80&w=600", "https://images.unsplash.com/photo-1620021319766-3d23d8583492?q=80&w=600", "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=600"],
        'mountain': ["https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=600", "https://images.unsplash.com/photo-1605649487212-4d63256d0295?q=80&w=600", "https://images.unsplash.com/photo-1623880529598-67ed07590800?q=80&w=600"],
        'history': ["https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=600", "https://images.unsplash.com/photo-1599661559868-b71569cb2cc7?q=80&w=600", "https://images.unsplash.com/photo-1600100397608-f010f41cb8ea?q=80&w=600"],
        'hotel': ["https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600", "https://images.unsplash.com/photo-1582719508461-89140b574932?q=80&w=600", "https://images.unsplash.com/photo-1542314831-c6a4d142104d?q=80&w=600"],
        'attraction': ["https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=600", "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=600", "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?q=80&w=600"],
        'flight': ["https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=600", "https://images.unsplash.com/photo-1544620347124-03c8947c8612?q=80&w=600", "https://images.unsplash.com/photo-1503251472901-522197170a48?q=80&w=600"],
        'train': ["https://images.unsplash.com/photo-1474487548417-7284482103f6?q=80&w=600", "https://images.unsplash.com/photo-1541088924-dc795af060d4?q=80&w=600", "https://images.unsplash.com/photo-1498114170363-d1ea21b2d35b?q=80&w=600"]
    };

    const getExactImage = (type, seedStr, name) => {
        if (name && realPlaceImages[name]) return realPlaceImages[name];
        const arr = fallbackImages[type] || fallbackImages['city'];
        let hash = 0;
        const str = seedStr || "default";
        for(let i=0; i<str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return arr[Math.abs(hash) % arr.length];
    };

    const coreDatabase = [
        "Tamil Nadu|Chennai|13.0827|80.2707|city", "Tamil Nadu|Munnar|10.0889|77.0595|mountain",
        "Tamil Nadu|Ooty|11.4064|76.6932|mountain", "Tamil Nadu|Madurai|9.9252|78.1198|history",
        "Tamil Nadu|Rameshwaram|9.2876|79.3129|history",
        "Kerala|Kochi|9.9312|76.2673|history", "Kerala|Alleppey|9.4981|76.3388|beach",
        "Maharashtra|Mumbai|19.0760|72.8777|city", "Maharashtra|Pune|18.5204|73.8567|city",
        "Maharashtra|Mahabaleshwar|17.9307|73.6477|mountain",
        "Delhi|New Delhi|28.6139|77.2090|city",
        "Uttar Pradesh|Agra|27.1767|78.0081|history", "Uttar Pradesh|Varanasi|25.3176|82.9739|history",
        "Rajasthan|Jaipur|26.9124|75.7873|city", "Rajasthan|Udaipur|24.5854|73.7125|romantic",
        "Rajasthan|Jodhpur|26.2389|73.0243|history",
        "Himachal Pradesh|Shimla|31.1048|77.1734|mountain", "Himachal Pradesh|Manali|32.2396|77.1887|mountain",
        "Goa|Goa|15.2993|74.1240|beach", "Gujarat|Ahmedabad|23.0225|72.5714|city",
        "West Bengal|Kolkata|22.5726|88.3639|city", "West Bengal|Darjeeling|27.0360|88.2627|mountain",
        "Odisha|Puri|19.8135|85.8312|history", "Karnataka|Bengaluru|12.9716|77.5946|city",
        "Karnataka|Mysuru|12.3051|76.6551|history"
    ];

    window.destinations = [];
    window.regionTree = {};

    coreDatabase.forEach(str => {
        let [state, name, lat, lon, type] = str.split('|');
        lat = parseFloat(lat); lon = parseFloat(lon);
        
        if(!window.regionTree[state]) window.regionTree[state] = true;

        let assignedTier = top25Places.includes(name) ? 1 : 2;

        window.destinations.push({
            name, lat, lon, type, state, tier: assignedTier,
            pricePerNight: Math.floor(Math.random() * 15000) + 2000,
            image: getExactImage(type, name, name),
            emoji: emojiMap[type] || '📍',
            desc: `Popular destination in ${state}.`,
            agency: "Premium India Tours",
            gallery: [getExactImage(type, name+"1", null), getExactImage(type, name+"2", null)]
        });

        for(let i=1; i<=45; i++) {
            let isHotel = i % 2 === 0;
            let microType = isHotel ? 'hotel' : 'attraction';
            let microName = isHotel ? `${name} Royal Hotel ${i}` : `${name} Tourist Spot ${i}`;
            let microLat = lat + (Math.random() - 0.5) * 0.15; 
            let microLon = lon + (Math.random() - 0.5) * 0.15;

            window.destinations.push({
                name: microName, lat: microLat, lon: microLon, type: microType,
                state, tier: 4, 
                pricePerNight: isHotel ? Math.floor(Math.random() * 25000) + 3000 : 0,
                image: getExactImage(microType, microName, null),
                emoji: emojiMap[microType],
                desc: isHotel ? `Luxury stay in ${name}.` : `Famous landmark in ${name}.`,
                agency: "Local Operators",
                gallery: [getExactImage(microType, microName+"1", null)]
            });
        }
    });

    // Add Major Transport Hubs
    const transportHubs = [
        "DEL Indira Gandhi|28.5562|77.1000|flight|Delhi",
        "BOM Chhatrapati Shivaji|19.0896|72.8656|flight|Maharashtra",
        "BLR Kempegowda Intl|13.1989|77.7068|flight|Karnataka",
        "MAA Chennai Intl|12.9941|80.1709|flight|Tamil Nadu",
        "CCU Netaji Subhash|22.6520|88.4463|flight|West Bengal",
        "HYD Rajiv Gandhi|17.2403|78.4294|flight|Telangana",
        "NDLS New Delhi Train|28.6429|77.2191|train|Delhi",
        "CSMT Mumbai Train|18.9400|72.8354|train|Maharashtra",
        "MAS Chennai Central|13.0822|80.2750|train|Tamil Nadu",
        "HWH Howrah Train|22.5839|88.3429|train|West Bengal"
    ];
    transportHubs.forEach(t => {
        let [name, lat, lon, type, state] = t.split('|');
        if(!window.regionTree[state]) window.regionTree[state] = true;
        window.destinations.push({
            name, lat: parseFloat(lat), lon: parseFloat(lon), type, state, tier: 3,
            pricePerNight: 0, image: getExactImage(type, name, name), emoji: emojiMap[type],
            desc: `Major Indian ${type} hub.`, agency: "Indian Railways / AAI", gallery: [getExactImage(type, name+"1", null)]
        });
    });

    window.destinations.forEach(dest => {
        const distKm = window.getDistance(window.userHomeLat, window.userHomeLon, dest.lat, dest.lon);
        dest.flightAvail = dest.type === 'flight' || distKm > 200;
        dest.flightTime = Math.max(0.5, Math.round((distKm / 800) * 10) / 10);
        dest.flightCost = Math.round(3000 + (distKm * 4)); // In INR
        dest.trainAvail = dest.type === 'train' || true; 
        dest.trainTime = Math.max(1, Math.round(distKm / 60)); 
        dest.trainCost = Math.round(500 + (distKm * 1.5)); // In INR
    });

    /* ==========================================
       5. HOME PAGE & CHECKOUT RENDERING
    ========================================== */
    let count = 1;
    let activeDest = null;
    document.getElementById('guestDecBtn').addEventListener('click', () => { if(count>1) { count--; document.getElementById('guestCount').innerText=count; document.getElementById('guestHidden').value=count; window.updateLivePrice(); }});
    document.getElementById('guestIncBtn').addEventListener('click', () => { if(count<20) { count++; document.getElementById('guestCount').innerText=count; document.getElementById('guestHidden').value=count; window.updateLivePrice(); }});

    window.selectDestinationAndRoute = function(name, image, desc, price, emoji, forceDate = null) {
        window.routeToTab('tab-home', `Selected ${name}`, true);
        document.getElementById('destInputBox').value = name;
        activeDest = window.destinations.find(d => d.name === name);
        if(forceDate) document.getElementById('bookingDateInput').value = forceDate;

        const preview = document.getElementById('bookingTripPreview');
        document.getElementById('previewImage').src = image;
        document.getElementById('previewTitle').innerText = `${emoji} ${name}`;
        document.getElementById('previewSubtitle').innerText = desc;
        
        const tMode = document.getElementById('transportMode');
        tMode.innerHTML = '';
        if(activeDest.flightAvail) tMode.innerHTML += `<option value="flight">🛫 Flight (${window.formatPrice(activeDest.flightCost)})</option>`;
        if(activeDest.trainAvail) tMode.innerHTML += `<option value="train">🚆 Train (${window.formatPrice(activeDest.trainCost)})</option>`;
        if(tMode.innerHTML === '') tMode.innerHTML = `<option value="flight">🚗 Drive / Bus</option>`;
        
        window.updateLivePrice();
        preview.classList.remove('hidden');
        setTimeout(() => { preview.classList.remove('scale-95', 'opacity-0'); }, 10);
    }

    window.updateLivePrice = function() {
       if(!activeDest) return;
       const travelClass = document.getElementById('travelClass').value;
       const transportMode = document.getElementById('transportMode').value;
       let basePrice = activeDest.pricePerNight;
       let transPrice = transportMode === 'train' ? (activeDest.trainCost || 500) : (activeDest.flightCost || 3000);
       const multiplier = travelClass === "Business" ? 2 : (travelClass === "First" ? 3 : 1);
       const totalInr = (basePrice + transPrice) * count * multiplier;
       document.getElementById('livePriceDisplay').innerText = window.formatPrice(totalInr);
    }

    window.renderDestinations = function() {
      const sort = document.getElementById("filterSort").value;
      const type = document.getElementById("filterType").value;

      let currentFilteredDests = window.destinations.filter(d => d.tier <= 2);

      if(type !== 'all') {
          currentFilteredDests = window.destinations.filter(d => d.tier <= 3 && d.type === type);
      }

      if(sort === 'price-low') currentFilteredDests.sort((a,b) => a.pricePerNight - b.pricePerNight);
      if(sort === 'price-high') currentFilteredDests.sort((a,b) => b.pricePerNight - a.pricePerNight);

      const scroll = document.getElementById("destinationScroll");
      if(currentFilteredDests.length === 0) {
          scroll.innerHTML = `<div class="w-full text-center py-10 opacity-50 font-bold">No destinations found.</div>`;
          return;
      }

      scroll.innerHTML = currentFilteredDests.slice(0, 30).map(dest => `
        <div class="relative rounded-[2.5rem] overflow-hidden cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 min-w-[300px] w-[300px] h-[420px] snap-center shrink-0 shadow-xl" 
             onclick="window.selectDestinationAndRoute('${dest.name}', '${dest.image}', '${dest.desc}', ${dest.pricePerNight}, '${dest.emoji}')">
          <img src="${dest.image}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" loading="lazy" />
          <div class="absolute inset-0 card-overlay flex flex-col justify-end p-8 text-white">
            <div class="mb-auto self-end glass-pill px-4 py-2 rounded-full">
              <p class="font-black text-sm">${dest.pricePerNight === 0 ? 'Hub' : window.formatPrice(dest.pricePerNight)} <span class="text-[10px] font-bold text-white/70 uppercase tracking-widest">${dest.pricePerNight===0?'':'/ nt'}</span></p>
            </div>
            <h3 class="text-3xl font-black mb-1 tracking-tight truncate">${dest.emoji} ${dest.name}</h3>
            <p class="text-sm font-medium text-white/80 mb-5 line-clamp-1">${dest.desc}</p>
            <button class="w-full glass-pill py-4 rounded-2xl font-black transition-colors active:scale-95 shadow-sm">Select Trip</button>
          </div>
        </div>
      `).join("");
    }
    window.renderDestinations();

    /* ==========================================
       6. LEAFLET MAP & SMART RENDERING & CLUSTERING
    ========================================== */
    const mapPopup = document.getElementById('mapPopup');
    let activeMapDest = null;
    window.leafletMap = null;
    window.mapInitialized = false;
    let renderedMarkers = new Map(); 

    const mapDestList = document.getElementById('mapDestinationsList');
    if(mapDestList) mapDestList.innerHTML = window.destinations.filter(d => d.tier <= 3).map(d => `<option value="${d.name}">`).join('');

    const mapSearchInput = document.getElementById('mapSearchInput');
    if (mapSearchInput) {
       mapSearchInput.addEventListener('keypress', (e) => {
           if(e.key === 'Enter') {
               const val = e.target.value.toLowerCase().trim();
               const destIndex = window.destinations.findIndex(d => d.name.toLowerCase() === val || d.name.toLowerCase().includes(val));
               if(destIndex !== -1) {
                   window.flyToDestination(window.destinations[destIndex]);
                   e.target.blur(); e.target.value = ''; 
               } else { window.showNotification("Location not found in database.", "error"); }
           }
       });
    }

    window.locateUserOnMap = function() {
        const btn = document.getElementById('mapLocateMeBtn');
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-base"></i>`;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                window.userHomeLat = pos.coords.latitude;
                window.userHomeLon = pos.coords.longitude;
                
                if(window.homeMarker) window.homeMarker.setLatLng([window.userHomeLat, window.userHomeLon]);
                if(window.leafletMap) window.leafletMap.flyTo([window.userHomeLat, window.userHomeLon], 13, { animate: true, duration: 1.5 });
                
                btn.innerHTML = `<i class="fa-solid fa-location-crosshairs text-base"></i>`;
                window.showNotification("Location found.", "success");
            }, () => {
                window.showNotification("Failed to access location.", "error");
                btn.innerHTML = `<i class="fa-solid fa-location-crosshairs text-base"></i>`;
            }, { enableHighAccuracy: true, timeout: 10000 });
        }
    };

    window.closeMapPopup = function() {
       mapPopup.classList.add('translate-y-[200%]');
       if(window.routeLine && window.leafletMap) { window.leafletMap.removeLayer(window.routeLine); window.routeLine = null; }
    }

    // Track active filters from the custom modal UI
    let activeMapState = 'all';
    let activeMapCategory = 'all';

    document.getElementById('mapFilterIconBtn').addEventListener('click', () => {
        window.openModal('mapFilterModal', 'mapFilterModalContent');
    });

    document.getElementById('applyMapFiltersBtn').addEventListener('click', () => {
        activeMapState = document.getElementById('modalFilterState').value;
        activeMapCategory = document.getElementById('modalFilterCategory').value;
        window.closeOverlays();
        
        if(activeMapState === 'all') {
            window.leafletMap.flyTo([20.5937, 78.9629], 5, { duration: 1.5 });
        } else {
            let found = window.destinations.find(d => d.state === activeMapState);
            if(found) window.leafletMap.flyTo([found.lat, found.lon], 7, { duration: 1.5 });
        }
        setTimeout(updateMapMarkers, 1500);
    });

    function updateMapMarkers() {
        if (!window.leafletMap || !window.markerClusterGroup) return;
        const zoom = window.leafletMap.getZoom();
        const bounds = window.leafletMap.getBounds();

        let maxTier = 0;
        if(zoom < 6) maxTier = 1;      // Distant: Only Top 25 places
        else if(zoom < 8) maxTier = 2; // Mid: Major Cities
        else if(zoom < 11) maxTier = 3; // Close: Hubs and Places
        else maxTier = 4;              // Very Close: Hotels, Attractions

        const visibleDests = window.destinations.filter(d => {
            if (d.tier > maxTier) return false;
            // Buffer bounds slightly to prevent markers popping in too late
            if (!bounds.pad(0.5).contains([d.lat, d.lon])) return false;
            if (activeMapState !== 'all' && d.state !== activeMapState) return false;
            if (activeMapCategory !== 'all') {
                if (activeMapCategory === 'hotel' || activeMapCategory === 'attraction' || activeMapCategory === 'flight' || activeMapCategory === 'train') {
                    if (d.type !== activeMapCategory) return false;
                } else {
                    if (d.type !== activeMapCategory) return false;
                }
            }
            return true;
        });

        // Cleanup invisible markers from cluster group safely
        for (let [name, marker] of renderedMarkers.entries()) {
            if (!visibleDests.find(d => d.name === name)) {
                window.markerClusterGroup.removeLayer(marker);
                renderedMarkers.delete(name);
            }
        }

        // Add newly visible markers to cluster
        const newMarkers = [];
        visibleDests.forEach(dest => {
            if (!renderedMarkers.has(dest.name)) {
                const customIcon = L.divIcon({
                   className: 'custom-map-pin',
                   html: `<div class="relative flex flex-col items-center group cursor-pointer" style="margin-top:-24px;">
                            <div class="marker-label absolute bottom-full mb-1 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 bg-white rounded-full px-2 py-1 shadow-md text-xs font-bold border border-slate-200 whitespace-nowrap origin-bottom z-10 flex items-center gap-1">
                               <span>${dest.emoji} ${dest.name}</span>
                            </div>
                            <div class="w-4 h-4 ${dest.type === 'flight' ? 'bg-indigo-400' : (dest.type === 'hotel' ? 'bg-rose-400' : (dest.type === 'train' ? 'bg-emerald-400' : 'bg-indigo-600'))} rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:scale-125 transition-transform"></div>
                          </div>`,
                   iconSize: [120, 50], iconAnchor: [60, 50]
                });
                const marker = L.marker([dest.lat, dest.lon], { icon: customIcon });
                marker.on('click', () => window.openMapPopup(dest));
                renderedMarkers.set(dest.name, marker);
                newMarkers.push(marker);
            }
        });
        
        if(newMarkers.length > 0) {
            window.markerClusterGroup.addLayers(newMarkers);
        }
    }

    window.initLeafletMap = function() {
       if (window.mapInitialized || typeof L === 'undefined') return;
       
       const globalBounds = L.latLngBounds([[-90, -180], [90, 180]]);

       window.leafletMap = L.map('leafletMap', { 
           zoomControl: false, 
           attributionControl: false, 
           maxBounds: globalBounds, 
           maxBoundsViscosity: 1.0,
           minZoom: 2, 
           maxZoom: 18,
           preferCanvas: true 
       }).setView([20.5937, 78.9629], 5);

       L.control.zoom({ position: 'bottomright' }).addTo(window.leafletMap);
       const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
       window.mapTileLayer = L.tileLayer(tileUrl, { maxZoom: 19, noWrap: true, bounds: globalBounds }).addTo(window.leafletMap);

       // Initialize MarkerClusterGroup
       window.markerClusterGroup = L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 40,
          iconCreateFunction: function(cluster) {
              return L.divIcon({ html: `<div class="marker-cluster-custom w-10 h-10">${cluster.getChildCount()}</div>`, className: '', iconSize: [40, 40] });
          }
       });
       window.leafletMap.addLayer(window.markerClusterGroup);

       const homeIcon = L.divIcon({
          className: 'custom-home-pin',
          html: `<div class="flex flex-col items-center group" style="margin-top:-24px;"><div class="bg-indigo-600 text-white rounded-full px-2 py-1 shadow-md text-[10px] font-black uppercase tracking-widest border border-white/20 whitespace-nowrap">Current Loc</div><div class="w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-md mt-1 animate-pulse"></div></div>`,
          iconSize: [80, 50], iconAnchor: [40, 50]
       });
       window.homeMarker = L.marker([window.userHomeLat, window.userHomeLon], { icon: homeIcon, zIndexOffset: 1000 }).addTo(window.leafletMap);

       window.leafletMap.on('moveend', updateMapMarkers);
       window.leafletMap.on('zoomend', updateMapMarkers);
       window.mapInitialized = true;
       
       // Immediately request user location
       if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition((pos) => {
               window.userHomeLat = pos.coords.latitude;
               window.userHomeLon = pos.coords.longitude;
               if(window.homeMarker) window.homeMarker.setLatLng([window.userHomeLat, window.userHomeLon]);
               window.leafletMap.setView([window.userHomeLat, window.userHomeLon], 13, { animate: true, duration: 1 });
               setTimeout(() => { window.leafletMap.invalidateSize(); updateMapMarkers(); }, 150);
           }, () => {
               window.userHomeLat = 13.0827; window.userHomeLon = 80.2707;
               window.leafletMap.setView([window.userHomeLat, window.userHomeLon], 13, { animate: true, duration: 1 });
               if(window.homeMarker) window.homeMarker.setLatLng([window.userHomeLat, window.userHomeLon]);
               setTimeout(() => { window.leafletMap.invalidateSize(); updateMapMarkers(); }, 150);
           }, { enableHighAccuracy: true, timeout: 5000 });
       } else {
           setTimeout(() => { window.leafletMap.invalidateSize(); updateMapMarkers(); }, 150);
       }
    }

    window.flyToDestination = function(dest) {
       if(window.leafletMap) {
          if(window.routeLine) { window.leafletMap.removeLayer(window.routeLine); window.routeLine = null; }
          window.leafletMap.flyTo([dest.lat, dest.lon], 13, { duration: 1.5, easeLinearity: 0.25 });
          setTimeout(() => window.openMapPopup(dest), 1200);
       }
    }

    window.startNavigation = async function(dest) {
        if(!window.leafletMap || !window.userHomeLat) return;
        const url = `https://router.project-osrm.org/route/v1/driving/${window.userHomeLon},${window.userHomeLat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
        try {
            window.showNotification("Calculating precise route...", "info");
            const res = await fetch(url);
            const data = await res.json();
            if(data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                if(window.routeLine) window.leafletMap.removeLayer(window.routeLine);
                window.routeLine = L.geoJSON(route.geometry, { style: { color: '#0ea5e9', weight: 5, opacity: 0.8 } }).addTo(window.leafletMap);
                window.leafletMap.fitBounds(window.routeLine.getBounds(), { padding: [50, 50], maxZoom: 10 });
                document.getElementById('mapTrainData').innerText = `${(route.duration / 3600).toFixed(1)}h Drive`;
                document.getElementById('mapDistanceData').innerText = `${(route.distance / 1000).toFixed(1)} km`;
            } else throw new Error("No route");
        } catch(e) {
            if(window.routeLine) window.leafletMap.removeLayer(window.routeLine);
            window.routeLine = L.polyline([[window.userHomeLat, window.userHomeLon], [dest.lat, dest.lon]], { color: '#4f46e5', weight: 3, dashArray: '10, 10', opacity: 0.7 }).addTo(window.leafletMap);
            window.leafletMap.fitBounds(window.routeLine.getBounds(), { padding: [50, 50], maxZoom: 8 });
            window.showNotification("Driving route unavailable. Showing aerial path.", "info");
        }
    };

    window.openMapPopup = function(dest) {
       activeMapDest = dest;
       document.getElementById('mapPopupImg').src = dest.image;
       document.getElementById('mapPopupTitle').innerText = `${dest.emoji} ${dest.name}`;
       document.getElementById('mapPopupPrice').innerText = dest.pricePerNight === 0 ? 'Explore' : `${window.formatPrice(dest.pricePerNight)} / night`;
       document.getElementById('mapPopupRating').innerText = `⭐ ${dest.rating || 4.8}`;

       const galContainer = document.getElementById('mapPopupGallery');
       if(galContainer && dest.gallery) {
           galContainer.innerHTML = dest.gallery.map(img => `<img src="${img}" class="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200" alt="Gallery">`).join('');
       }

       const distKm = window.getDistance(window.userHomeLat, window.userHomeLon, dest.lat, dest.lon).toFixed(1);
       document.getElementById('mapFlightData').innerText = dest.flightAvail ? `${window.formatPrice(dest.flightCost)} • ${dest.flightTime}h` : 'N/A';
       document.getElementById('mapDistanceData').innerText = `${distKm} km Away`;

       window.openFavoritesModal = function() {
          const user = JSON.parse(localStorage.getItem("travique_user"));
          if (!user) { window.showNotification("Please log in first", "error"); return; }
          
          const favs = JSON.parse(localStorage.getItem('travique_favorites') || '[]');
          const favsList = document.getElementById('favoritesList');
          
          if (favs.length === 0) {
              favsList.innerHTML = `<div class="text-center py-10 opacity-50 font-bold text-sm">No saved locations yet.</div>`;
          } else {
              favsList.innerHTML = favs.map(f => {
                  const savedDest = window.destinations.find(d => d.name === f);
                  if(!savedDest) return '';
                  return `
                      <div class="liquid-glass p-4 rounded-2xl flex items-center gap-4 border border-white/40 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform" onclick="window.closeOverlays(); window.routeToTab('tab-maps'); setTimeout(()=>window.flyToDestination(window.destinations.find(d=>d.name==='${savedDest.name}')), 400)">
                          <img src="${savedDest.image}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=600';" class="w-14 h-14 rounded-xl object-cover" />
                          <div class="flex-1">
                              <h4 class="font-black text-lg tracking-tight">${savedDest.emoji} ${savedDest.name}</h4>
                              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${savedDest.state}</p>
                          </div>
                          <button class="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center" onclick="event.stopPropagation(); window.removeFavorite('${savedDest.name}')"><i class="fa-solid fa-trash text-xs"></i></button>
                      </div>
                  `;
              }).join('');
          }
          window.openModal('favoritesModal', 'favoritesModalContent');
       };

       let favs = JSON.parse(localStorage.getItem('travique_favorites') || '[]');
       const favBtn = document.getElementById('mapPopupFavBtn');
       if(favs.includes(dest.name)) {
           favBtn.classList.add('bg-rose-500', 'text-white'); favBtn.classList.remove('bg-rose-50', 'text-rose-500');
       } else {
           favBtn.classList.remove('bg-rose-500', 'text-white'); favBtn.classList.add('bg-rose-50', 'text-rose-500');
       }
       mapPopup.classList.remove('translate-y-[200%]');
    }

    window.removeFavorite = function(name) {
        let favs = JSON.parse(localStorage.getItem('travique_favorites') || '[]');
        favs = favs.filter(f => f !== name);
        localStorage.setItem('travique_favorites', JSON.stringify(favs));
        window.openFavoritesModal();
    };

    document.getElementById('mapPopupNavBtn').addEventListener('click', () => { if(activeMapDest) window.startNavigation(activeMapDest); });
    document.getElementById('mapPopupBookBtn').addEventListener('click', () => {
       if(activeMapDest) { window.closeMapPopup(); window.selectDestinationAndRoute(activeMapDest.name, activeMapDest.image, activeMapDest.desc, activeMapDest.pricePerNight, activeMapDest.emoji); }
    });
    document.getElementById('mapPopupFavBtn').addEventListener('click', () => {
       if(!activeMapDest) return;
       let favs = JSON.parse(localStorage.getItem('travique_favorites') || '[]');
       const favBtn = document.getElementById('mapPopupFavBtn');
       if(favs.includes(activeMapDest.name)) {
           favs = favs.filter(f => f !== activeMapDest.name);
           favBtn.classList.remove('bg-rose-500', 'text-white'); favBtn.classList.add('bg-rose-50', 'text-rose-500');
           window.showNotification("Removed from favorites", "info");
       } else {
           favs.push(activeMapDest.name);
           favBtn.classList.add('bg-rose-500', 'text-white'); favBtn.classList.remove('bg-rose-50', 'text-rose-500');
           window.showNotification("Added to favorites!", "success");
       }
       localStorage.setItem('travique_favorites', JSON.stringify(favs));
    });

    /* ==========================================
       7. BOOKING SYSTEM & CALL ENGINE
    ========================================== */
    document.getElementById('bookingForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const user = JSON.parse(localStorage.getItem("travique_user"));
      if (!user) { window.showNotification("Log in first!", "error"); window.routeToTab('tab-profile'); return; }
      if (!activeDest) return window.showNotification("Please select a destination.", "error");

      const travelClass = document.getElementById('travelClass').value;
      const transportMode = document.getElementById('transportMode').value;
      let basePrice = activeDest.pricePerNight;
      let transPrice = transportMode === 'train' ? (activeDest.trainCost || 500) : (activeDest.flightCost || 3000);
      const costInr = (basePrice + transPrice) * count * (travelClass === "Business" ? 2 : (travelClass === "First" ? 3 : 1));

      if (window.walletBalance < costInr) return window.showNotification(`Insufficient Wallet Balance. Need ${window.formatPrice(costInr)}.`, "error");

      const submitBtn = document.getElementById('bookSubmitBtn');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true; submitBtn.classList.add('opacity-80');
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Processing Payment...</span>`;
      
      setTimeout(() => {
          window.showNotification(`Payment of ${window.formatPrice(costInr)} approved.`, "info");
          submitBtn.innerHTML = `<i class="fa-solid fa-shield-check"></i> <span>Issuing Tickets...</span>`;
          setTimeout(() => {
              const ref = "BK" + Math.floor(10000+Math.random()*90000);
              let bks = JSON.parse(localStorage.getItem('travique_bookings')||'[]');
              bks.push({email: user.email, destination: activeDest.name, agency: activeDest.agency, guests: count, date: document.getElementById('bookingDateInput').value, reference: ref, vacationType: travelClass});
              localStorage.setItem('travique_bookings', JSON.stringify(bks));

              user.balance -= costInr; 
              let users = JSON.parse(localStorage.getItem('travique_db_users') || '[]');
              let dbUser = users.find(u => u.email === user.email);
              if(dbUser) dbUser.balance = user.balance;
              localStorage.setItem('travique_db_users', JSON.stringify(users));

              window.walletBalance = user.balance; 
              localStorage.setItem('travique_user', JSON.stringify(user)); 
              
              if(window.addTxn) window.addTxn(`Booked ${activeDest.name}`, costInr, "sub");
              if(window.updateWalletUI) window.updateWalletUI();
              window.showNotification(`Ticket sent to ${user.email}.`, "success");
              
              e.target.reset(); count=1; document.getElementById('guestCount').innerText=1;
              submitBtn.disabled = false; submitBtn.classList.remove('opacity-80'); submitBtn.innerHTML = originalText;
              document.getElementById('livePriceDisplay').innerText = `₹0`;
              
              document.getElementById('bookingTripPreview').classList.add('hidden');
              window.routeToTab('tab-bookings');
              setTimeout(() => window.triggerCall(activeDest.agency, activeDest.name), 2500);
          }, 1800);
      }, 1500);
    });

    window.triggerCall = function(agencyName, destName) {
      const modal = document.getElementById('callModal');
      document.getElementById('callAgencyName').innerText = agencyName;
      document.getElementById('callActions').classList.remove('hidden');
      modal.classList.remove('hidden');
      setTimeout(() => modal.classList.remove('opacity-0'), 10);
      window.callTimeout = setTimeout(() => { if(!modal.classList.contains('hidden')) window.declineCall(); }, 15000);
    }
    window.acceptCall = function() {
        clearTimeout(window.callTimeout);
        document.getElementById('callStatus').innerText = "00:01 • Connected";
        document.getElementById('callActions').classList.add('hidden');
        setTimeout(() => { window.showNotification("Booking confirmed. Safe travels!", "success"); setTimeout(() => window.declineCall(), 3500); }, 1500);
    }
    window.declineCall = function() {
        clearTimeout(window.callTimeout);
        const modal = document.getElementById('callModal');
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 500);
    }

    /* ==========================================
       8. AI ASSISTANT LOGIC
    ========================================== */
    const aiInput = document.getElementById('aiInput');
    const aiMicBtn = document.getElementById('aiMicBtn');
    const aiStatusText = document.getElementById('aiStatusText');
    const aiSuggestionsGrid = document.getElementById('aiSuggestionsGrid');

    function processAIPrompt(text) {
       if (!text) return;
       const lowerText = text.toLowerCase();
       
       let dateStr = null;
       let dateMatch = lowerText.match(/(?:on|for)\s+([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
       if(dateMatch) {
           let d = new Date(dateMatch[1] + (dateMatch[1].includes(new Date().getFullYear().toString()) ? '' : ' ' + new Date().getFullYear()));
           if(!isNaN(d.getTime()) && d > new Date()) dateStr = d.toISOString().split('T')[0];
           else if (!isNaN(d.getTime())) { d.setFullYear(d.getFullYear() + 1); dateStr = d.toISOString().split('T')[0]; }
       }
       if(lowerText.includes('tomorrow')) { let d = new Date(); d.setDate(d.getDate() + 1); dateStr = d.toISOString().split('T')[0]; }

       let bookMatch = lowerText.match(/book\s+(?:(\d+)\s+)?(?:tickets?\s+to\s+|\s*to\s+)?([a-z\s]+?)(?:\s+on|\s+for|\s*$)/i);
       if(bookMatch) {
           let num = parseInt(bookMatch[1]) || 1;
           let destNameTarget = bookMatch[2].trim();
           let found = window.destinations.find(d => d.name.toLowerCase() === destNameTarget || d.name.toLowerCase().includes(destNameTarget));
           if(found) {
               window.showNotification(`AI initializing booking for ${num} guest(s) to ${found.name}...`, 'success');
               count = num; document.getElementById('guestCount').innerText = count; document.getElementById('guestHidden').value = count;
               window.selectDestinationAndRoute(found.name, found.image, found.desc, found.pricePerNight, found.emoji, dateStr);
               return;
           }
       }

       let guests = 1;
       const guestMatch = lowerText.match(/for (\d+)|\b(two|three|four|five|six)\b guests?/);
       if(guestMatch) {
          const wordToNum = {two:2, three:3, four:4, five:5, six:6};
          guests = guestMatch[1] ? parseInt(guestMatch[1]) : wordToNum[guestMatch[2]];
          count = guests; document.getElementById('guestCount').innerText = count; document.getElementById('guestHidden').value = count;
       }

       let filtered = window.destinations.filter(d=>d.tier <= 3); 
       if (lowerText.includes('beach') || lowerText.includes('sea')) filtered = filtered.filter(d => d.type === 'beach');
       else if (lowerText.includes('city') || lowerText.includes('urban')) filtered = filtered.filter(d => d.type === 'city');
       else if (lowerText.includes('romantic') || lowerText.includes('honeymoon')) filtered = filtered.filter(d => d.type === 'romantic');
       else if (lowerText.includes('mountain') || lowerText.includes('snow')) filtered = filtered.filter(d => d.type === 'mountain');
       else if (lowerText.includes('train')) filtered = filtered.filter(d => d.trainAvail);
       else {
          let strictMatch = filtered.filter(d => lowerText.includes(d.name.toLowerCase()));
          if(strictMatch.length > 0) filtered = strictMatch;
          else filtered = filtered.sort(() => 0.5 - Math.random()).slice(0, 4); 
       }

       aiSuggestionsGrid.innerHTML = filtered.slice(0,4).map(dest => `
          <div class="liquid-glass p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform shadow-sm"
               onclick="window.selectDestinationAndRoute('${dest.name}', '${dest.image}', '${dest.desc}', ${dest.pricePerNight}, '${dest.emoji}', '${dateStr || ''}')">
             <img src="${dest.image}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=600';" class="w-16 h-16 rounded-xl object-cover shadow-sm" alt="${dest.name}">
             <div class="flex-1">
                <h4 class="font-black text-lg tracking-tight">${dest.emoji} ${dest.name}</h4>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${guests > 1 ? guests + ' Guests' : '1 Guest'} • AI Match</p>
             </div>
             <div class="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-arrow-right"></i></div>
          </div>
       `).join("");
    }

    aiInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') { processAIPrompt(aiInput.value); aiInput.blur(); } });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
       const recognition = new SpeechRecognition(); recognition.continuous = false;
       recognition.onstart = () => { aiStatusText.classList.remove('hidden'); aiMicBtn.classList.add('bg-rose-500', 'animate-pulse'); aiMicBtn.classList.remove('bg-indigo-600'); };
       recognition.onresult = (e) => { const transcript = e.results[0][0].transcript; aiInput.value = transcript; processAIPrompt(transcript); };
       recognition.onend = () => { aiStatusText.classList.add('hidden'); aiMicBtn.classList.remove('bg-rose-500', 'animate-pulse'); aiMicBtn.classList.add('bg-indigo-600'); };
       aiMicBtn.addEventListener('click', () => { try { recognition.start(); } catch(e) { recognition.stop(); } });
    } else {
       aiMicBtn.addEventListener('click', () => window.showNotification("Voice input not supported in this browser.", "error"));
    }

    /* ==========================================
       9. TICKETS VIEWER & CANCELATION
    ========================================== */
    window.cancelBooking = function(ref, btn) {
      if(!confirm(`Cancel ticket ${ref}?`)) return;
      let bks = JSON.parse(localStorage.getItem('travique_bookings')||'[]').filter(b => b.reference !== ref);
      localStorage.setItem('travique_bookings', JSON.stringify(bks));
      btn.closest('.liquid-glass').style.opacity = '0.4'; btn.remove();
      window.showNotification("Ticket Cancelled.", "info");
    };

    document.getElementById('lookupBtn').addEventListener('click', () => {
      const email = document.getElementById('lookupEmail').value;
      if(!email) return window.showNotification("Enter email", "error");
      
      let localBks = JSON.parse(localStorage.getItem('travique_bookings')||'[]').filter(b => b.email === email);
      const list = document.getElementById('bookingsList');
      if(localBks.length === 0) {
        list.innerHTML = `<div class="text-center py-16 opacity-40"><i class="fa-solid fa-ticket text-6xl mb-4 text-indigo-500"></i><p class="font-bold">No tickets found.</p></div>`; return;
      }
      list.innerHTML = localBks.reverse().map(b => `<div class="liquid-glass rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 border border-white/50"><div class="flex justify-between items-start"><h3 class="text-2xl font-black tracking-tight">${b.destination}</h3><span class="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-500/20">Confirmed</span></div><p class="text-xs font-bold text-slate-500 -mt-3"><i class="fa-solid fa-building-user mr-1"></i> Handled by: ${b.agency || 'Travique'}</p><div class="grid grid-cols-2 gap-3 p-4 bg-white/40 rounded-2xl border border-white/40"><div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Date</p><p class="font-black text-sm">${b.date}</p></div><div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Class</p><p class="font-black text-sm">${b.vacationType}</p></div></div><div class="flex items-center justify-between pt-1"><div class="text-xs font-bold text-slate-500">Ref: <span class="font-mono text-indigo-600 bg-indigo-500/10 px-2 py-1 rounded-md ml-1 border border-indigo-500/20">${b.reference}</span></div><button onclick="cancelBooking('${b.reference}', this)" class="px-5 py-2.5 text-xs font-black text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl active:scale-95 transition-colors">Cancel</button></div></div>`).join("");
    });

});
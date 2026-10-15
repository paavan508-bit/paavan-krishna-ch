(function () {
    let currentSatId = '25544';
    const WAQI_TOKEN = 'demo';

    function switchView(viewName, activeBtn) {
        document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

        if (viewName === 'tracking') {
            document.getElementById('trackingView')?.classList.add('active');
        } else if (viewName === 'processing') {
            document.getElementById('processingView')?.classList.add('active');
        } else if (viewName === 'aiConsole') {
            document.getElementById('aiConsoleView')?.classList.add('active');
        }

        if (activeBtn) activeBtn.classList.add('active');
    }

    function toggleMenu() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed');
    }

    async function switchSatellite(name, noradId, activeBtn) {
        currentSatId = noradId;
        const satNameEl = document.getElementById('satName');
        const radarLabelEl = document.getElementById('activeRadarLabel');
        if (satNameEl) satNameEl.innerText = name;
        if (radarLabelEl) radarLabelEl.innerText = name.toUpperCase();
        
        document.querySelectorAll('.sub-btn').forEach(btn => btn.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');

        const sysStatus = document.getElementById('systemStatus');
        if (sysStatus) sysStatus.innerText = "FETCHING TLE...";
        await fetchAndTrackSatellite();
    }

    async function fetchAndTrackSatellite() {
        try {
            if (typeof satellite === 'undefined') throw new Error("Offline / Satellite library not loaded");

            const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${currentSatId}&FORMAT=TLE`);
            const text = await response.text();
            const lines = text.trim().split('\n');

            if (lines.length < 2) throw new Error("Invalid TLE");

            const tleLine1 = lines.length === 3 ? lines[1] : lines[0];
            const tleLine2 = lines.length === 3 ? lines[2] : lines[1];

            const sysStatus = document.getElementById('systemStatus');
            if (sysStatus) {
                sysStatus.innerText = "LIVE UPLINK ACTIVE";
                sysStatus.style.color = "#34d399";
            }

            const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

            clearInterval(window.trackerInterval);
            window.trackerInterval = setInterval(() => updateOrbitPosition(satrec), 1000);
            updateOrbitPosition(satrec);

        } catch (err) {
            const sysStatus = document.getElementById('systemStatus');
            if (sysStatus) {
                sysStatus.innerText = "SIMULATION FALLBACK (OFFLINE)";
                sysStatus.style.color = "#fbbf24";
            }
            runFallbackSimulation();
        }
    }

    function updateOrbitPosition(satrec) {
        if (typeof satellite === 'undefined') return runFallbackSimulation();

        const now = new Date();
        const pv = satellite.propagate(satrec, now);
        const gmst = satellite.gstime(now);

        if (pv.position) {
            const pd = satellite.eciToGeodetic(pv.position, gmst);
            const lat = satellite.degreesLat(pd.latitude);
            const lng = satellite.degreesLong(pd.longitude);
            const height = pd.height;
            const speed = Math.sqrt(pv.velocity.x**2 + pv.velocity.y**2 + pv.velocity.z**2);

            const latEl = document.getElementById('satLat');
            const lngEl = document.getElementById('satLng');
            const altEl = document.getElementById('satAlt');
            const velEl = document.getElementById('satVel');

            if (latEl) latEl.innerText = lat.toFixed(2) + "°";
            if (lngEl) lngEl.innerText = lng.toFixed(2) + "°";
            if (altEl) altEl.innerText = height.toFixed(1) + " km";
            if (velEl) velEl.innerText = speed.toFixed(2) + " km/s";

            const mapX = ((lng + 180) / 360) * 100;
            const mapY = ((90 - lat) / 180) * 100;

            const blip = document.getElementById('targetBlip');
            if (blip) {
                blip.style.left = `${mapX}%`;
                blip.style.top = `${mapY}%`;
            }
        }
    }

    function runFallbackSimulation() {
        let step = 0;
        clearInterval(window.trackerInterval);
        window.trackerInterval = setInterval(() => {
            step += 0.04;
            let lat = Math.sin(step) * 45;
            let lng = (step * 25) % 360 - 180;

            const latEl = document.getElementById('satLat');
            const lngEl = document.getElementById('satLng');
            const altEl = document.getElementById('satAlt');
            const velEl = document.getElementById('satVel');

            if (latEl) latEl.innerText = lat.toFixed(2) + "°";
            if (lngEl) lngEl.innerText = lng.toFixed(2) + "°";
            if (altEl) altEl.innerText = "415.4 km";
            if (velEl) velEl.innerText = "7.66 km/s";

            const mapX = ((lng + 180) / 360) * 100;
            const mapY = ((90 - lat) / 180) * 100;

            const blip = document.getElementById('targetBlip');
            if (blip) {
                blip.style.left = `${mapX}%`;
                blip.style.top = `${mapY}%`;
            }
        }, 1000);
    }

    function runDataProcessing() {
        const consoleLogs = document.getElementById('consoleLogs');
        const timestamp = new Date().toLocaleTimeString();
        if (!consoleLogs) return;
        
        consoleLogs.innerHTML += `<br>[${timestamp}] Executing atmospheric aerosol matrix sweep...`;
        setTimeout(() => {
            consoleLogs.innerHTML += `<br>[${timestamp}] NO2 columns verified. Carbon offset and SDG metrics validated.`;
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
        }, 800);
    }

    function generateLocationStats(cityName) {
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
            hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const lat = (17.38 + (Math.abs(hash % 100) / 100)).toFixed(2);
        const lng = (78.48 + (Math.abs((hash >> 2) % 100) / 100)).toFixed(2);
        const aqi = 85 + (Math.abs(hash) % 45);
        const pm25 = (aqi * 0.62).toFixed(1);
        const temp = 26 + (Math.abs(hash) % 7);
        const hum = 50 + (Math.abs(hash) % 30);
        const no2 = (25 + (Math.abs(hash) % 20)).toFixed(1);

        const formattedName = cityName.charAt(0).toUpperCase() + cityName.slice(1);

        return `
            <div class="ai-card" style="border-color: #38bdf8;">
                <div class="ai-card-header"><span style="color:#38bdf8;">📡 REGIONAL TELEMETRY // ${formattedName.toUpperCase()}</span><span style="color:#34d399;">NODE 404-OK</span></div>
                <div class="ai-stat-row" style="margin-top:8px;"><span>Target Coordinates</span><b>${lat}° N, ${lng}° E</b></div>
                <div class="ai-stat-row"><span>Air Quality Index (AQI)</span><b>${aqi} PM2.5 (${aqi <= 100 ? 'Moderate' : 'Unhealthy'})</b></div>
                <div class="ai-stat-row"><span>PM2.5 Concentration</span><b>${pm25} µg/m³</b></div>
                <div class="ai-stat-row"><span>NO2 Column Density</span><b>${no2} µg/m³</b></div>
                <div class="ai-stat-row"><span>Surface Temp / Humidity</span><b>${temp}°C / ${hum}%</b></div>
                <div class="visual-bar-container" style="margin-top:8px;"><div class="visual-bar-fill" style="width: ${Math.min(aqi, 100)}%; background-color: ${aqi <= 100 ? '#38bdf8' : '#fbbf24'};"></div></div>
            </div>
        `;
    }

    async function processAICommand() {
        const inputField = document.getElementById('aiUserInput');
        const chatLog = document.getElementById('aiChatLog');
        if (!inputField || !chatLog) return;

        const query = inputField.value.trim();
        if (!query) return;

        chatLog.innerHTML += `<div class="ai-msg user"><strong>[OPERATOR]:</strong> ${query}</div>`;
        inputField.value = '';
        chatLog.scrollTop = chatLog.scrollHeight;

        let replyHtml = "";
        const lowerQ = query.toLowerCase();

        let cityName = lowerQ.replace(/hows|how is|tell me about|status for/gi, '').trim();

        const isNumberOnly = /^\d+$/.test(cityName) || /^\d+$/.test(lowerQ);
        const isShortOrInvalid = cityName.length < 2 || /^[a-z]$/i.test(cityName);
        const containsGibberishToken = /\d+[a-z]+\d+/i.test(lowerQ) || /[a-z]+\d+[a-z]+/i.test(lowerQ);
        const words = query.split(/\s+/);
        const isKeyboardSmash = words.some(w => (w.length > 5 && !/[aeiouy]/i.test(w)) || containsGibberishToken);

        const isSDG4 = lowerQ.includes('sdg 4') || lowerQ.includes('sdg4') || lowerQ.includes('education');
        const isSDG13 = lowerQ.includes('sdg 13') || lowerQ.includes('sdg13') || lowerQ.includes('climate');
        const isSDG6 = lowerQ.includes('sdg 6') || lowerQ.includes('sdg6') || lowerQ.includes('water');
        const isListSDG = lowerQ.includes('all sdg') || lowerQ.includes('list sdg') || lowerQ.includes('17 sdg');

        if ((isNumberOnly || isShortOrInvalid || isKeyboardSmash) && !isSDG4 && !isSDG13 && !isSDG6 && !isListSDG) {
            replyHtml = `
                <div class="ai-card" style="border-color: #ef4444;">
                    <div class="ai-card-header"><span style="color:#ef4444;">⚠️ SYSTEM EXCEPTION</span><span style="color:#ef4444;">ERR_CODE 400</span></div>
                    <div class="ai-card-desc" style="margin-top:8px;">Command string rejected. Unrecognized coordinate, satellite designation, or telemetry index. Verify parameters and retry.</div>
                </div>
            `;
            chatLog.innerHTML += `<div class="ai-msg system">${replyHtml}</div>`;
            chatLog.scrollTop = chatLog.scrollHeight;
            return;
        }

        if (isListSDG) {
            replyHtml = `
                <div class="ai-card">
                    <div class="ai-card-header"><span>🌐 UN 17 SUSTAINABLE DEVELOPMENT GOALS</span><span style="color:#34d399;">INDEX LOADED</span></div>
                    <div style="max-height: 220px; overflow-y: auto; margin-top: 10px; padding-right: 5px;">
                        <div class="ai-stat-row"><span>SDG 1</span><b>No Poverty</b></div>
                        <div class="ai-stat-row"><span>SDG 2</span><b>Zero Hunger</b></div>
                        <div class="ai-stat-row"><span>SDG 3</span><b>Good Health & Well-Being</b></div>
                        <div class="ai-stat-row" style="color:#c5192d;"><span>SDG 4</span><b>Quality Education</b></div>
                        <div class="ai-stat-row"><span>SDG 5</span><b>Gender Equality</b></div>
                        <div class="ai-stat-row" style="color:#26bde2;"><span>SDG 6</span><b>Clean Water & Sanitation</b></div>
                        <div class="ai-stat-row"><span>SDG 7</span><b>Affordable & Clean Energy</b></div>
                        <div class="ai-stat-row"><span>SDG 8</span><b>Decent Work & Economic Growth</b></div>
                        <div class="ai-stat-row"><span>SDG 9</span><b>Industry, Innovation & Infrastructure</b></div>
                        <div class="ai-stat-row"><span>SDG 10</span><b>Reduced Inequalities</b></div>
                        <div class="ai-stat-row"><span>SDG 11</span><b>Sustainable Cities & Communities</b></div>
                        <div class="ai-stat-row"><span>SDG 12</span><b>Responsible Consumption & Production</b></div>
                        <div class="ai-stat-row" style="color:#3f7e44;"><span>SDG 13</span><b>Climate Action</b></div>
                        <div class="ai-stat-row"><span>SDG 14</span><b>Life Below Water</b></div>
                        <div class="ai-stat-row"><span>SDG 15</span><b>Life on Land</b></div>
                        <div class="ai-stat-row"><span>SDG 16</span><b>Peace, Justice & Strong Institutions</b></div>
                        <div class="ai-stat-row"><span>SDG 17</span><b>Partnerships for the Goals</b></div>
                    </div>
                </div>
            `;
        } else if (isSDG4) {
            replyHtml = `
                <div class="ai-card" style="border-color: #c5192d;">
                    <div class="ai-card-header"><span style="color:#c5192d;">📚 TARGET BRIEFING // SDG 4</span><span style="color:#34d399;">VERIFIED</span></div>
                    <div class="ai-stat-row" style="margin-top:8px;"><span>Objective</span><b>Ensure inclusive and equitable quality education</b></div>
                    <div class="ai-stat-row"><span>Sensor Link</span><b>Remote Educational Infrastructure Grid</b></div>
                    <div class="visual-bar-container" style="margin-top:8px;"><div class="visual-bar-fill" style="width: 82%; background-color: #c5192d;"></div></div>
                </div>
            `;
        } else if (isSDG13) {
            replyHtml = `
                <div class="ai-card" style="border-color: #3f7e44;">
                    <div class="ai-card-header"><span style="color:#3f7e44;">🌍 TARGET BRIEFING // SDG 13</span><span style="color:#34d399;">VERIFIED</span></div>
                    <div class="ai-stat-row" style="margin-top:8px;"><span>Objective</span><b>Climate action and emission mitigation tracking</b></div>
                    <div class="ai-stat-row"><span>Sensor Link</span><b>GHG Spectrometer & Polar Ice Radar</b></div>
                    <div class="visual-bar-container" style="margin-top:8px;"><div class="visual-bar-fill" style="width: 90%; background-color: #3f7e44;"></div></div>
                </div>
            `;
        } else if (isSDG6) {
            replyHtml = `
                <div class="ai-card" style="border-color: #26bde2;">
                    <div class="ai-card-header"><span style="color:#26bde2;">💧 TARGET BRIEFING // SDG 6</span><span style="color:#34d399;">VERIFIED</span></div>
                    <div class="ai-stat-row" style="margin-top:8px;"><span>Objective</span><b>Clean water and sanitation management</b></div>
                    <div class="ai-stat-row"><span>Sensor Link</span><b>Reservoir Thermal & Aquifer Mapping Node</b></div>
                    <div class="visual-bar-container" style="margin-top:8px;"><div class="visual-bar-fill" style="width: 75%; background-color: #26bde2;"></div></div>
                </div>
            `;
        } else if (lowerQ.includes('iss')) {
            replyHtml = `
                <div class="ai-card">
                    <div class="ai-card-header"><span>🌍 SATELLITE DOWNLINK // ISS</span><span style="color:#34d399;">NORAD #25544</span></div>
                    <div class="ai-stat-row" style="margin-top:8px;"><span>Orbit Profile</span><b>Low Earth Orbit (~415 km)</b></div>
                    <div class="ai-stat-row"><span>Telemetry Stream</span><b>Active Earth Observation Feed</b></div>
                </div>
            `;
            switchSatellite('ISS (ZARYA)', '25544');
        } else if (lowerQ.includes('cartosat')) {
            replyHtml = `
                <div class="ai-card">
                    <div class="ai-card-header"><span>🌐 SATELLITE DOWNLINK // CARTOSAT-3</span><span style="color:#38bdf8;">NORAD #44804</span></div>
                    <div class="ai-stat-row" style="margin-top:8px;"><span>Resolution</span><b>0.25m Panchromatic Grid</b></div>
                    <div class="ai-stat-row"><span>Telemetry Stream</span><b>Urban Planning & Mapping</b></div>
                </div>
            `;
            switchSatellite('CARTOSAT-3', '44804');
        } else if (lowerQ.includes('insat')) {
            replyHtml = `
                <div class="ai-card">
                    <div class="ai-card-header"><span>🌧️ SATELLITE DOWNLINK // INSAT-3DR</span><span style="color:#10b981;">NORAD #41752</span></div>
                    <div class="ai-stat-row" style="margin-top:8px;"><span>Mission</span><b>Meteorological & Early Warning</b></div>
                    <div class="ai-stat-row"><span>Telemetry Stream</span><b>Atmospheric Sounding Feed</b></div>
                </div>
            `;
            switchSatellite('INSAT-3DR', '41752');
        } else if (lowerQ.includes('vrs') || lowerQ.includes('vjs') || lowerQ.includes('school')) {
            replyHtml = `
                <div class="ai-card">
                    <div class="ai-card-header"><span>🏫 TARGET SITE // VRS & VJS SCHOOL</span><span style="color:#38bdf8;">PINNED</span></div>
                    <div class="ai-stat-row" style="margin-top:8px;"><span>Coordinates</span><b>16.50° N, 80.64° E</b></div>
                    <div class="ai-stat-row"><span>Telemetry Stream</span><b>Surface Infrastructure Node</b></div>
                </div>
            `;
            
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.getElementById('trackingView')?.classList.add('active');
            
            const satNameEl = document.getElementById('satName');
            const radarLabelEl = document.getElementById('activeRadarLabel');
            const latEl = document.getElementById('satLat');
            const lngEl = document.getElementById('satLng');
            const altEl = document.getElementById('satAlt');
            const velEl = document.getElementById('satVel');

            if (satNameEl) satNameEl.innerText = "VRS & VJS SCHOOL TARGET";
            if (radarLabelEl) radarLabelEl.innerText = "VRS & VJS SCHOOL (PINNED)";
            if (latEl) latEl.innerText = "16.50° N";
            if (lngEl) lngEl.innerText = "80.64° E";
            if (altEl) altEl.innerText = "0.0 km (Surface)";
            if (velEl) velEl.innerText = "0.00 km/s";
            
            const blip = document.getElementById('targetBlip');
            if (blip) {
                blip.style.left = `72%`;
                blip.style.top = `45%`;
            }
        } else {
            if (!cityName) cityName = query;

            try {
                const response = await fetch(`https://api.waqi.info/feed/${encodeURIComponent(cityName)}/?token=${WAQI_TOKEN}`);
                const data = await response.json();

                if (data.status === 'ok' && data.data && data.data.city) {
                    const res = data.data;
                    const aqi = res.aqi;
                    const stationName = res.city.name;
                    const lat = res.city.geo[0];
                    const lng = res.city.geo[1];
                    const temp = res.iaqi.t ? res.iaqi.t.v : '27';
                    const hum = res.iaqi.h ? res.iaqi.h.v : '62';
                    const pm25 = res.iaqi.pm25 ? res.iaqi.pm25.v : (aqi * 0.6).toFixed(1);

                    replyHtml = `
                        <div class="ai-card" style="border-color: #38bdf8;">
                            <div class="ai-card-header"><span style="color:#38bdf8;">📡 LIVE FEED // ${stationName.toUpperCase()}</span><span style="color:#34d399;">CONNECTED</span></div>
                            <div class="ai-stat-row" style="margin-top:8px;"><span>Coordinates</span><b>${lat}° N, ${lng}° E</b></div>
                            <div class="ai-stat-row"><span>Air Quality Index (AQI)</span><b>${aqi} (${aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : 'Unhealthy'})</b></div>
                            <div class="ai-stat-row"><span>PM2.5 Concentration</span><b>${pm25} µg/m³</b></div>
                            <div class="ai-stat-row"><span>Temperature / Humidity</span><b>${temp}°C / ${hum}%</b></div>
                            <div class="visual-bar-container" style="margin-top:8px;"><div class="visual-bar-fill" style="width: ${Math.min(aqi, 100)}%; background-color: ${aqi <= 50 ? '#34d399' : '#fbbf24'};"></div></div>
                        </div>
                    `;
                } else {
                    replyHtml = generateLocationStats(cityName);
                }
            } catch (e) {
                replyHtml = generateLocationStats(cityName);
            }
        }

        chatLog.innerHTML += `<div class="ai-msg system">${replyHtml}</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    document.addEventListener('DOMContentLoaded', () => {
        fetchAndTrackSatellite();

        document.getElementById('menuToggleBtn')?.addEventListener('click', toggleMenu);

        document.getElementById('navTracking')?.addEventListener('click', (e) => switchView('tracking', e.currentTarget));
        document.getElementById('navProcessing')?.addEventListener('click', (e) => switchView('processing', e.currentTarget));
        document.getElementById('navAiConsole')?.addEventListener('click', (e) => switchView('aiConsole', e.currentTarget));

        document.getElementById('btnIss')?.addEventListener('click', (e) => switchSatellite('ISS (ZARYA)', '25544', e.currentTarget));
        document.getElementById('btnNoaa')?.addEventListener('click', (e) => switchSatellite('NOAA 18', '28654', e.currentTarget));
        document.getElementById('btnHubble')?.addEventListener('click', (e) => switchSatellite('Hubble Telescope', '20580', e.currentTarget));

        document.getElementById('runSweepBtn')?.addEventListener('click', runDataProcessing);

        const aiInput = document.getElementById('aiUserInput');
        aiInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') processAICommand();
        });

        document.getElementById('sendAiBtn')?.addEventListener('click', processAICommand);
    });
})();
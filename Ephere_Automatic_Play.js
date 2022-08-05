// ==UserScript==
// @name         Ephere Automatic Play
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  AutoPlay mode for Ephere
// @author       Negan
// @match        https://play.ephere.football/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ephere.football
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let exhausted = false;

    window.alert = (msg) => {
        if (msg == 'Some of your ephereals are not available to play matches.') {
            exhausted = true;
        }
    };

    var timerManager = (function () {
        var timers = [];
        return {
            addTimer: function (callback, timeout, source) {
                var timer, that = this;
                timer = setTimeout(function () {
                    that.removeTimer(timer);
                    callback();
                }, timeout);
                timers.push({timer: timer, source: source});
                return timer;
            },
            removeTimer: function (timer) {
                clearTimeout(timer.timer);
                timers.splice(timers.indexOf(timer.timer), 1);
            },
            getTimers: function () {
                return timers;
            },
            removeAllTimers: function () {
                var that = this;
                timers.forEach((timer) => {
                    that.removeTimer(timer);
                    console.log('[TIMERS] Removing timer: ' + timer.source);
                });
            }
        };
    })();

    let playButtonSelector = '.css-1vzxuti';
    let myNameSelector = '.css-841hfn';
    let rivalNameSelector = '.css-19jh306'
    let matchResultSelector = '.css-1bonmw0';
    let finalScoreSelector = '.css-sixl46';
    let checkboxSelector = '.autoPlay';
    let topBarLeftSelector = '.css-1y3ojfh';

    let autoMode = false;

    let getPlayButton = () => {
        return document.querySelector(playButtonSelector);
    };

    let getMyName = () => {
        return document.querySelector(myNameSelector).textContent;
    };

    let getRivalName = () => {
        return document.querySelector(rivalNameSelector).textContent;
    };

    let getMatchResult = () => {
        return document.querySelector(matchResultSelector).textContent;
    };

    let getMyFinalScore = () => {
        return document.querySelectorAll(finalScoreSelector)[0].textContent;
    };

    let getRivalFinalScore = () => {
        return document.querySelectorAll(finalScoreSelector)[2].textContent;
    };

    let getCheckbox = () => {
        return document.querySelector(checkboxSelector);
    };

    let resetExhaustedAndStartFromScratchLater = () => {
        let minutesToWait = 10;
        exhausted = false;
        timerManager.removeAllTimers();
        timerManager.addTimer(() => mainFunc(), 60*1000*minutesToWait, 'mainFunc');
        console.log(`[Ephere] Players exhausted; retrying in ${minutesToWait} minutes`);
    };

    let waitForPlayButton = async () => new Promise((resolve, reject) => {
        let funcQueryPlayButton = (resolve) => {
            let e = document.querySelector(playButtonSelector);
            let isActive = e && !e.classList.contains('Mui-disabled');

            if (isActive) {
                resolve();
            } else {
                timerManager.addTimer(() => funcQueryPlayButton(resolve), 1000, 'waitForPlayButton');
            }
        };

        timerManager.addTimer(() => funcQueryPlayButton(resolve), 1000, 'waitForPlayButton');
    });

    let waitForMatchToStart = async () => new Promise((resolve, reject) => {
        let funcMatchStart = (resolve) => {
            let e = document.querySelector(myNameSelector);

            if (e != null) {
                resolve();
            } else if (!exhausted) {
                let isPlayButtonAvailable = getPlayButton() != null;
                if (isPlayButtonAvailable) {
                    play();
                }
                timerManager.addTimer(() => funcMatchStart(resolve), 2000, 'waitForMatchToStart');
            } else {
                resetExhaustedAndStartFromScratchLater();
            }
        };

        timerManager.addTimer(() => funcMatchStart(resolve), 10000, 'waitForMatchToStart');
    });

    let waitForMatchToEnd = async () => new Promise((resolve, reject) => {
        let funcMatchEnd = (resolve) => {
            let e = document.querySelector(matchResultSelector);

            if (e != null) {
                resolve(document.querySelector(playButtonSelector));
            } else {
                timerManager.addTimer(() => funcMatchEnd(resolve), 5000, 'waitForMatchToEnd');
            }
        };

        timerManager.addTimer(() => funcMatchEnd(resolve), 200000, 'waitForMatchToEnd');
    });

    let play = () => {
        let playButton = getPlayButton();
        playButton.click();
    };

    let toggleAuto = (activated) => {
        if (activated) {
            autoMode = true;
            console.log("[Ephere] Auto ON");
            mainFunc();
        } else {
            autoMode = false;
            console.log("[Ephere] Auto OFF");
            timerManager.removeAllTimers();
        }
    };

    let checkAutoButtonExistsOrAdd = () => {
        if (document.querySelector(checkboxSelector) == null) {
            var s = document.createElement('style');
            s.innerHTML = `.switch {position: absolute; inline-size: 150px; top:50%; left:50%; transform: translate(-50%, -50%); display: inline-block; width: 60px; height: 34px; } .switch input {opacity: 0; width: 0; height: 0; } .slider {position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: .4s; transition: .4s; } .slider:before {position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; -webkit-transition: .4s; transition: .4s; } input:checked + .slider {background-color: #2196F3; } input:focus + .slider {box-shadow: 0 0 1px #2196F3; } input:checked + .slider:before {-webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); } .slider.round {border-radius: 34px; } .slider.round:before {border-radius: 50%; }`;
            document.getElementsByTagName("head")[0].appendChild(s);
            let topBarLeft = document.querySelector(topBarLeftSelector);
            let e = document.createElement('label');
            e.innerHTML = `<label class="switch"><input type="checkbox" ${autoMode ? " checked" : ""} class="${checkboxSelector.substring(1)}"><span class="slider round"></span></label>`;
            topBarLeft.append(e);
            let checkBox = getCheckbox();
            checkBox.addEventListener("click", () => toggleAuto(checkBox.checked), false);
        }
    };

    let mainFunc = () => {
        waitForPlayButton().then(() => {
            timerManager.addTimer(() => {
                play();
                if (exhausted == false) {
                    waitForMatchToStart().then(() => {
                        console.log('[Ephere-1] Playing against ' + getRivalName());
                        waitForMatchToEnd().then(() => {
                            let matchResult = getMatchResult();
                            console.log(`[Ephere-2] ${matchResult} | ${getMyFinalScore()} - ${getRivalFinalScore()}`);
                            play();
                            mainFunc();
                        });
                    });
                } else {
                    resetExhaustedAndStartFromScratchLater();
                }
            }, 1000, 'mainFunc');
        });
    }

    setInterval(() => checkAutoButtonExistsOrAdd(), 1000);

    // [DEBUG]
   /*setInterval(() => {
        console.log(`[TIMERS] ${timerManager.getTimers().length} timers: ${timerManager.getTimers().map(o => o.source)}`);
    }, 1000);*/
})();
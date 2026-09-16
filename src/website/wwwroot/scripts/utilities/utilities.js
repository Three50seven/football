var UTILITIES = {
    getRandomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },
    getNumberWithEnding: function(number) {
        //just return 0 if anything less than 1 is passed in
        if (number <= 0)
            return 0;
        //get the 'th' numbers first since this covers the majority:
        if (number % 100 === 10 || number % 100 === 11 || number % 100 === 12 || number % 100 === 13
            || number % 10 === 4 || number % 10 === 5 || number % 10 === 6 || number % 10 === 7
            || number % 10 === 8 || number % 10 === 9 || number % 10 === 0)
            return number.toString() + 'th';
        if (number % 10 === 1)
            return number.toString() + 'st';
        if (number % 10 === 2)
            return number.toString() + 'nd';
        if (number % 10 === 3)
            return number.toString() + 'rd';
    },
    //note, only works for minutes/seconds as of writing of function and needs at the time
    getTimeDisplay: function (timeSeconds) {
        console.log('timeSeconds: %s', timeSeconds);
        if (timeSeconds > 0) {
            var minutes = Math.floor(timeSeconds / 60);
            var seconds = timeSeconds - minutes * 60;
            return UTILITIES.strPadLeft(minutes, '0', 2) + ':' + UTILITIES.strPadLeft(seconds, '0', 2);
        }
        else {
            return '00:00';
        }
    },
    strPadLeft: function (string, pad, length) {
        return (new Array(length + 1).join(pad) + string).slice(-length);
    },
    titleCase: function (str) {
        let splitStr = '';

        if (str) {
            splitStr = str.toLowerCase().split(' ');
            for (var i = 0; i < splitStr.length; i++) {
                // You do not need to check if i is larger than splitStr length, as your for does that for you
                // Assign it back to the array
                splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
            }
            splitStr = splitStr.join(' ');
        }
        // Directly return the joined string
        return splitStr;
    },
    splitCamelCase: function (str) {
        if (str)
            return str.replace(/([A-Z]+)/g, "$1").replace(/([A-Z][a-z])/g, " $1"); //split on capital letters first (camel case strings) , e.g. thisString = this String       
        else
            return '';
    },
    splitAndTitleCase: function (str) {
        return UTILITIES.titleCase(UTILITIES.splitCamelCase(str));
    },
    getFullTeamName: function (teamName, teamId) {
        if (!teamName)
            return '';

        if (self.awayTeamID() === teamId) {
            return teamName + ' (away)';
        }
        else {
            return teamName + ' (home)';
        }
    },
    getTeamImagePath: function (teamId) {
        if (!teamId)
            return '';

        if (self.awayTeamID() === teamId) {
            return self.awayTeamInfo().teamImage();
        }
        else {
            return self.homeTeamInfo().teamImage();
        }
    },
    //Wires up a horizontally scrolling strip (e.g. the team picker):
    //  - turns vertical mouse wheel into horizontal scrolling, 1:1 with the wheel so it never feels laggy
    //  - leaves touch panning to the browser, which is smoother than anything we can do from script
    //  - flags the wrapper with can-scroll-left/can-scroll-right so CSS can fade the correct edge
    //options: { fadeTarget, previousButton, nextButton, step }
    initHorizontalScroller: function (scroller, options) {
        let settings = options || {};
        let element = UTILITIES.resolveElement(scroller);

        if (!element)
            return null;

        let fadeTarget = UTILITIES.resolveElement(settings.fadeTarget) || element.parentElement;
        let previousButton = UTILITIES.resolveElement(settings.previousButton);
        let nextButton = UTILITIES.resolveElement(settings.nextButton);
        let updateQueued = false;

        function maxScrollLeft() {
            return element.scrollWidth - element.clientWidth;
        }

        function updateFades() {
            if (!fadeTarget)
                return;

            //1px of slack: fractional scroll offsets and zoom keep scrollLeft from landing exactly on the ends
            let maxScroll = maxScrollLeft();
            let canScrollLeft = maxScroll > 1 && element.scrollLeft > 1;
            let canScrollRight = maxScroll > 1 && element.scrollLeft < maxScroll - 1;

            fadeTarget.classList.add('scroller-ready');
            fadeTarget.classList.toggle('can-scroll-left', canScrollLeft);
            fadeTarget.classList.toggle('can-scroll-right', canScrollRight);
        }

        //scroll fires far more often than we can paint, so collapse bursts into one update per frame
        function queueUpdate() {
            if (updateQueued)
                return;

            updateQueued = true;
            window.requestAnimationFrame(function () {
                updateQueued = false;
                updateFades();
            });
        }

        function scrollByStep(direction) {
            let step = settings.step || Math.max(150, Math.round(element.clientWidth * 0.8));

            element.scrollBy({ left: direction * step, behavior: 'smooth' });
        }

        element.addEventListener('wheel', function (e) {
            //let the browser own pinch-zoom and trackpad gestures that are already horizontal
            if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))
                return;

            let maxScroll = maxScrollLeft();

            if (maxScroll <= 1)
                return;

            //deltaMode 1 = lines, 2 = pages; normalize both to pixels
            let delta = e.deltaY;

            if (e.deltaMode === 1)
                delta *= 16;
            else if (e.deltaMode === 2)
                delta *= element.clientWidth;

            //at either end, give the wheel back to the page so it keeps scrolling vertically
            if ((delta < 0 && element.scrollLeft <= 0) || (delta > 0 && element.scrollLeft >= maxScroll - 1))
                return;

            e.preventDefault();
            element.scrollLeft += delta;
        }, { passive: false });

        element.addEventListener('scroll', queueUpdate, { passive: true });
        window.addEventListener('resize', queueUpdate);

        if (previousButton)
            previousButton.addEventListener('click', function () { scrollByStep(-1); });

        if (nextButton)
            nextButton.addEventListener('click', function () { scrollByStep(1); });

        //catches the strip being shown/hidden or reflowed (it starts out display:none behind a ko visible binding)
        if (window.ResizeObserver) {
            let observer = new ResizeObserver(queueUpdate);

            observer.observe(element);
        }

        queueUpdate();

        return { update: queueUpdate, scrollByStep: scrollByStep };
    },
    resolveElement: function (target) {
        if (!target)
            return null;

        return typeof target === 'string' ? document.querySelector(target) : target;
    }
};
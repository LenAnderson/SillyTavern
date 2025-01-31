import { POPUP_RESULT, POPUP_TYPE, Popup } from './popup.js';

/** @type {Popup} */
let loaderPopup;

let preloaderYoinked = false;

window.statusList = [];
export async function updateLoaderStatus(message, ...promises) {
    window.statusList.push(message);
    const msgDict = {
        'initial setup': `Polishing the tavern's bar...`,
        'registering core slash commands': `Teaching the bartender some basic tricks...`,
        'registering listeners': `Tuning in to the gossip channels...`,
        'getting CSRF token': `Brewing a fresh batch of anti-troll potion...`,
        'adding compatibility patches': `Sewing up some plot holes...`,
        'registering additional slash commands': `Adding more sprinkles to your AI cupcake...`,
        'initializing LLM providers': `Waking up the tavern's wise storytellers...`,
        'loading extensions': `Adding secret passages to the tavern...`,
        'registering extension slash commands': `Expanding the AI's vocabulary with some fancy words...`,
        'registering tool call slash commands': `Sharpening the tools of the trade...`,
        'initializing preset manager': `Organizing the tavern's extensive recipe book...`,
        'loading welcome message': "Penning a warm welcome note for your arrival...",
        'loading user settings': `Adjusting your favorite seat at the bar...`,
        'registering keyboard shortcuts': `Memorizing the secret knock...`,
        'loading dynamic styles': `Changing the tavern's drapes to match the season...`,
        'initializing tags': `Labeling the ingredients in the pantry...`,
        'initializing bookmarks': `Getting your favorite stories from the grand library...`,
        'initializing macros': `Brewing some time-saving elixirs...`,
        'loading user avatar': `Dusting off the portraits of our esteemed guests...`,
        'loading characters': `Inviting some friends to the party, it's getting lively...`,
        'loading backgrounds': `Setting the stage for some epic adventures...`,
        'initializing tokenizers': `Calibrating the scales for weighing your words...`,
        'loading personas': `Donning the masks for tonight's masquerade...`,
        'initializing CFG and log probs': `Consulting the oracles for a glimpse of the future...`,
        'initializing markdown shortcuts': `Scribing ancient runes into the grimoire...`,
        'initializing server history': `Reliving the tavern's most memorable nights...`,
        'initializing settings search': `Summoning a magical magnifying glass...`,
        'initializing character bulk edit': `Rounding up the guests for a group makeover...`,
        'initializing data bank scrapers': `Dispatching scouts to gather the latest gossip...`,
        'checking for extension updates': `Knocking on the neighbors' doors to see if they have any new toys...`,
    };
    const msg = loaderPopup?.content?.querySelector('#load-spinner-message');
    if (!msg) return;
    const el = document.createElement('div'); {
        el.textContent = msgDict[message] ?? message;
        el.title = message;
        msg.append(el);
    }
    await Promise.all(promises);
    el.remove();
}

export function showLoader() {
    // Two loaders don't make sense. Don't await, we can overlay the old loader while it closes
    if (loaderPopup) loaderPopup.complete(POPUP_RESULT.CANCELLED);

    loaderPopup = new Popup(`
        <div id="loader" style="color:white;">
            <div id="load-spinner" class="fa-solid fa-gear fa-spin fa-3x"></div>
            <div id="load-spinner-message" style="position:fixed;top:4em;left:0;right:0;"></div>
        </div>`, POPUP_TYPE.DISPLAY, null, { transparent: true, animation: 'none' });

    // No close button, loaders are not closable
    loaderPopup.closeButton.style.display = 'none';

    loaderPopup.show();
}

export async function hideLoader() {
    if (!loaderPopup) {
        console.warn('There is no loader showing to hide');
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const spinner = $('#load-spinner');
        if (!spinner.length) {
            console.warn('Spinner element not found, skipping animation');
            cleanup();
            return;
        }

        // Check if transitions are enabled
        const transitionDuration = spinner[0] ? getComputedStyle(spinner[0]).transitionDuration : '0s';
        const hasTransitions = parseFloat(transitionDuration) > 0;

        if (hasTransitions) {
            Promise.race([
                new Promise((r) => setTimeout(r, 500)), // Fallback timeout
                new Promise((r) => spinner.one('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', r)),
            ]).finally(cleanup);
        } else {
            cleanup();
        }

        function cleanup() {
            $('#loader').remove();
            // Yoink preloader entirely; it only exists to cover up unstyled content while loading JS
            // If it's present, we remove it once and then it's gone.
            yoinkPreloader();

            loaderPopup.complete(POPUP_RESULT.AFFIRMATIVE)
                .catch((err) => console.error('Error completing loaderPopup:', err))
                .finally(() => {
                    loaderPopup = null;
                    resolve();
                });
        }

        // Apply the styles
        spinner.css({
            'filter': 'blur(15px)',
            'opacity': '0',
        });
    });
}

function yoinkPreloader() {
    if (preloaderYoinked) return;
    document.getElementById('preloader').remove();
    preloaderYoinked = true;
}

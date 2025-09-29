import { POPUP_RESULT, POPUP_TYPE, Popup } from './popup.js';

/** @type {Popup} */
let loaderPopup;

let preloaderYoinked = false;

window.statusList = [];
export async function updateLoaderStatus(message, ...promises) {
    window.statusList.push(message);
    const msgDict = {
        'initial setup': [
            `Polishing the tavern's bar...`,
            `Sweeping the sawdust off the floor...`,
            `Lighting the tavern's hearth...`,
            `Unlocking the front door...`,
            `Setting up the first round of drinks...`
        ],
        'registering core slash commands': [
            `Teaching the bartender some basic tricks...`,
            `Drilling the staff on essential procedures...`,
            `Establishing the house rules...`,
            `Imprinting core instructions...`,
            `Setting the foundational spells...`
        ],
        'registering listeners': [
            `Tuning in to the gossip channels...`,
            `Lending an ear to the tavern chatter...`,
            `Listening for the town crier...`,
            `Keeping an eye on the tavern door...`,
            `Attuning to the ambient aether...`
        ],
        'getting CSRF token': [
            `Brewing a fresh batch of anti-troll potion...`,
            `Bolting the windows against gremlins...`,
            `Casting a ward of protection...`,
            `Checking for sticky fingers...`,
            `Applying anti-scrying enchantments...`
        ],
        'adding compatibility patches': [
            `Sewing up some plot holes...`,
            `Mending tears in the fabric of reality...`,
            `Ensuring all the cogs mesh smoothly...`,
            `Ironing out the wrinkles in the timeline...`,
            `Harmonizing the disparate energies...`
        ],
        'registering additional slash commands': [
            `Adding more sprinkles to your AI cupcake...`,
            `Teaching the staff advanced maneuvers...`,
            `Expanding the command repertoire...`,
            `Unlocking special abilities...`,
            `Adding flourishes to the basic tricks...`
        ],
        'initializing LLM providers': [
            `Waking up the tavern's wise storytellers...`,
            `Arousing the slumbering oracles...`,
            `Summoning the ancient wordsmiths...`,
            `Invoking the narrative spirits...`,
            `Opening the channel to the realms of text...`
        ],
        'loading extensions': [
            `Adding secret passages to the tavern...`,
            `Unlocking hidden rooms and features...`,
            `Integrating mysterious artifacts...`,
            `Expanding the tavern's blueprints...`,
            `Weaving in external enchantments...`
        ],
        'registering extension slash commands': [
            `Expanding the AI's vocabulary with some fancy words...`,
            `Teaching the storytellers new phrases...`,
            `Adding exotic commands to the lexicon...`,
            `Learning the language of the extensions...`,
            `Scribing new commands onto the menu...`
        ],
        'registering tool call slash commands': [
            `Sharpening the tools of the trade...`,
            `Polishing the tinkering implements...`,
            `Getting the contraptions ready...`,
            `Preparing the instruments for use...`,
            `Loading the utility belt...`
        ],
        'initializing preset manager': [
            `Organizing the tavern's extensive recipe book...`,
            `Cataloging the saved concoctions...`,
            `Arranging the favorite settings...`,
            `Indexing the preferred brews...`,
            `Stocking the cellar with saved recipes...`
        ],
        'loading welcome message': [
            "Penning a warm welcome note for your arrival...",
            " Chalking up the welcome sign...",
            " unfurling the banner of greeting...",
            " Preparing the initial pleasantries...",
            " Laying out the welcome mat..."
        ],
        'loading user settings': [
            `Adjusting your favorite seat at the bar...`,
            `Fluffing your preferred cushion...`,
            `Setting out your personal tankard...`,
            `Tuning the environment to your liking...`,
            `Recalling your last preferences...`
        ],
        'registering keyboard shortcuts': [
            `Memorizing the secret knock...`,
            `Learning the quick gestures...`,
            `Mapping the hidden passages...`,
            `Setting the quick access runes...`,
            `Binding actions to incantations...`
        ],
        'loading dynamic styles': [
            `Changing the tavern's drapes to match the season...`,
            `Applying a fresh coat of paint...`,
            `Adjusting the mood lighting...`,
            `Swapping the tavern's aesthetic...`,
            `Infusing the visuals with seasonal magic...`
        ],
        'initializing tags': [
            `Labeling the ingredients in the pantry...`,
            `Sorting the wares by type...`,
            `Assigning categories to the curios...`,
            `Marking the barrels for easy identification...`,
            `Creating order from the inventory...`
        ],
        'initializing bookmarks': [
            `Getting your favorite stories from the grand library...`,
            `Finding your place in the epic saga...`,
            `Pulling out the saved chapters...`,
            `Marking the important passages...`,
            `Retrieving the most cherished memories...`
        ],
        'initializing macros': [
            `Brewing some time-saving elixirs...`,
            `Concocting helpful shortcuts...`,
            `Mixing up efficiency potions...`,
            `Preparing automated sequences...`,
            `Infusing routines with speed magic...`
        ],
        'loading user avatars': [
            `Dusting off the portraits of our esteemed guests...`,
            `Hanging your likeness on the wall...`,
            `Revealing your heroic visage...`,
            `Preparing your distinguished portrait...`,
            `Conjuring your appearance...`
        ],
        'loading characters': [
            `Inviting some friends to the party, it's getting lively...`,
            `Gathering the cast of characters...`,
            `Opening the tavern doors for guests...`,
            `Assembling the dramatis personae...`,
            `Bringing the personalities to life...`
        ],
        'loading backgrounds': [
            `Setting the stage for some epic adventures...`,
            `Painting the scenery for tonight's tale...`,
            `Unrolling the backdrop scrolls...`,
            `Preparing the visual ambiance...`,
            `Conjuring the environment...`
        ],
        'initializing tokenizers': [
            `Calibrating the scales for weighing your words...`,
            `Sharpening the quill for accurate scribing...`,
            `Tuning the language analysis engine...`,
            `Preparing to measure every syllable...`,
            `Setting the linguistic parsing array...`
        ],
        'loading personas': [
            `Donning the masks for tonight's masquerade...`,
            `Preparing the different guises...`,
            `Selecting the roles for the performance...`,
            `Gathering the various identities...`,
            `Applying the layers of persona...`
        ],
        'initializing CFG and log probs': [
            `Consulting the oracles for a glimpse of the future...`,
            `Reading the tea leaves of possibility...`,
            `Communing with the spirits of probability...`,
            `Predicting the twists of fate...`,
            `Gazing into the scrying pool of outcomes...`
        ],
        'initializing markdown shortcuts': [
            `Scribing ancient runes into the grimoire...`,
            `Etching formatting symbols onto the slate...`,
            `Binding text magic to quick gestures...`,
            `Preparing the scribe's shorthand...`,
            `Loading the mystic text symbols...`
        ],
        'initializing server history': [
            `Reliving the tavern's most memorable nights...`,
            `Flipping through the chronicles of the past...`,
            `Recounting the epic sagas...`,
            `Bringing back echoes of previous chats...`,
            `Dusting off the history books...`
        ],
        'initializing settings search': [
            `Summoning a magical magnifying glass...`,
            `Enchanting the spyglass for settings...`,
            `Preparing the divining rod for configurations...`,
            `Making the options visible...`,
            `Setting up the settings radar...`
        ],
        'initializing character bulk edit': [
            `Rounding up the guests for a group makeover...`,
            `Gathering the party for simultaneous adjustments...`,
            `Preparing the characters for batch transformation...`,
            `Lining up the portraits for a quick touch-up...`,
            `Assembling the roster for mass updates...`
        ],
        'initializing data bank scrapers': [
            `Dispatching scouts to gather the latest gossip...`,
            `Sending ravens to collect external news...`,
            `Commissioning spies for information retrieval...`,
            `Setting out the nets for data fishing...`,
            `Consulting external informants...`
        ],
        'checking for extension updates': [
            `Knocking on the neighbors' doors to see if they have any new toys...`,
            `Checking the marketplace for fresh wares...`,
            `Seeing if the wandering merchants have arrived...`,
            `Peeking in on the extension workshops...`,
            `Scanning the horizon for new arrivals...`
        ],
        'initializing World Info': [
            `Organizing the world's memories...`,
            `Indexing the grand library of lore...`,
            `Arranging the Lorebook entries...`,
            `Preparing the dynamic lore...`,
            `Gathering the world's tales...`
        ],
        'determining client version': [
            `Checking your adventurer's guild ID...`,
            `Reading the inscription on your tavern key...`,
            `Identifying your crest...`,
            `Verifying the age of your map...`,
            `Confirming your membership scroll...`
        ],
        'checking API keys': [
            `Showing your pass to the bouncer...`,
            `Testing the arcane sigils...`,
            `Ensuring your key fits the lock...`,
            `Verifying the guild's credentials...`,
            `Checking the seals on the pact...`
        ],
        'loading UI translations': [
            `Teaching the parrot new phrases...`,
            `Consulting the Orb of Tongues...`,
            `Translating the ancient tavern script...`,
            `Loading the linguistic charms...`,
            `Preparing the common tongue dictionary...`
        ],
    };
    const msg = loaderPopup?.content?.querySelector('#load-spinner-message');
    let el;
    if (msg) {
        el = document.createElement('div'); {
            el.textContent = msgDict[message]?.[Math.floor(Math.random() * msgDict[message].length)] ?? message;
            el.title = message;
            msg.append(el);
        }
    }
    await Promise.all(promises);
    el?.remove();
}

export function showLoader() {
    // Two loaders don't make sense. Don't await, we can overlay the old loader while it closes
    if (loaderPopup) loaderPopup.complete(POPUP_RESULT.CANCELLED);

    loaderPopup = new Popup(`
        <div id="loader" style="color:white;">
            <div id="load-spinner" class="fa-solid fa-gear fa-spin fa-3x"></div>
            <div id="load-spinner-message" style="position:fixed;top:4em;left:0;right:0;"></div>
        </div>`, POPUP_TYPE.DISPLAY, null, { transparent: true, animation: 'none', wide: true, large: true });

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

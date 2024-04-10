/*
TODO:
*/
//const DEBUG_TONY_SAMA_FORK_MODE = true

import { getRequestHeaders, callPopup, processDroppedFiles, reloadMarkdownProcessor } from '../../../script.js';
import { deleteExtension, extensionNames, getContext, installExtension, renderExtensionTemplate } from '../../extensions.js';
import { POPUP_TYPE, Popup, callGenericPopup } from '../../popup.js';
import { executeSlashCommands } from '../../slash-commands.js';
import { getStringHash, isValidUrl } from '../../utils.js';
export { MODULE_NAME };

const MODULE_NAME = 'assets';
const DEBUG_PREFIX = '<Assets module> ';
let previewAudio = null;
let ASSETS_JSON_URL = 'https://raw.githubusercontent.com/SillyTavern/SillyTavern-Content/main/index.json';


// DBG
//if (DEBUG_TONY_SAMA_FORK_MODE)
//    ASSETS_JSON_URL = "https://raw.githubusercontent.com/Tony-sama/SillyTavern-Content/main/index.json"
let availableAssets = {};
let currentAssets = {};

//#############################//
//  Extension UI and Settings  //
//#############################//

function filterAssets() {
    const searchValue = String($('#assets_search').val()).toLowerCase().trim();
    const typeValue = String($('#assets_type_select').val());

    if (typeValue === '') {
        $('#assets_menu .assets-list-div').show();
        $('#assets_menu .assets-list-div h3').show();
    } else {
        $('#assets_menu .assets-list-div h3').hide();
        $('#assets_menu .assets-list-div').hide();
        $(`#assets_menu .assets-list-div[data-type="${typeValue}"]`).show();
    }

    if (searchValue === '') {
        $('#assets_menu .asset-block').show();
    } else {
        $('#assets_menu .asset-block').hide();
        $('#assets_menu .asset-block').filter(function () {
            return $(this).text().toLowerCase().includes(searchValue);
        }).show();
    }
}

const KNOWN_TYPES = {
    'extension': 'Extensions',
    'character': 'Characters',
    'ambient': 'Ambient sounds',
    'bgm': 'Background music',
    'blip': 'Blip sounds',
};

function downloadAssetsList(url) {
    updateCurrentAssets().then(function () {
        fetch(url, { cache: 'no-cache' })
            .then(response => response.json())
            .then(json => {

                availableAssets = {};
                $('#assets_menu').empty();

                console.debug(DEBUG_PREFIX, 'Received assets dictionary', json);
                json.sort((a,b)=>(a.name ?? a.id).toLowerCase().localeCompare((b.name ?? b.id).toLowerCase()));

                for (const i of json) {
                    //console.log(DEBUG_PREFIX,i)
                    if (availableAssets[i['type']] === undefined)
                        availableAssets[i['type']] = [];

                    availableAssets[i['type']].push(i);
                }

                console.debug(DEBUG_PREFIX, 'Updated available assets to', availableAssets);
                // First extensions, then everything else
                const assetTypes = Object.keys(availableAssets).sort((a, b) => (a === 'extension') ? -1 : (b === 'extension') ? 1 : 0);

                $('#assets_type_select').empty();
                $('#assets_search').val('');
                $('#assets_type_select').append($('<option />', { value: '', text: 'All' }));

                for (const type of assetTypes) {
                    const option = $('<option />', { value: type, text: KNOWN_TYPES[type] || type });
                    $('#assets_type_select').append(option);
                }

                if (assetTypes.includes('extension')) {
                    $('#assets_type_select').val('extension');
                }

                $('#assets_type_select').off('change').on('change', filterAssets);
                $('#assets_search').off('input').on('input', filterAssets);

                for (const assetType of assetTypes) {
                    let assetTypeMenu = $('<div />', { id: 'assets_audio_ambient_div', class: 'assets-list-div' });
                    assetTypeMenu.attr('data-type', assetType);
                    assetTypeMenu.append(`<h3>${KNOWN_TYPES[assetType] || assetType}</h3>`).hide();

                    if (assetType == 'extension') {
                        assetTypeMenu.append(`
                        <div class="assets-list-git">
                            To download extensions from this page, you need to have <a href="https://git-scm.com/downloads" target="_blank">Git</a> installed.<br>
                            Click the <i class="fa-brands fa-sm fa-github"></i> icon to visit the Extension's repo for tips on how to use it.
                        </div>`);
                    }

                    for (const i in availableAssets[assetType]) {
                        const asset = availableAssets[assetType][i];
                        const elemId = `assets_install_${assetType}_${i}`;
                        let element = $('<div />', { id: elemId, class: 'asset-download-button right_menu_button' });
                        const label = $('<i class="fa-fw fa-solid fa-download fa-lg"></i>');
                        element.append(label);

                        //if (DEBUG_TONY_SAMA_FORK_MODE)
                        //    asset["url"] = asset["url"].replace("https://github.com/SillyTavern/","https://github.com/Tony-sama/"); // DBG

                        console.debug(DEBUG_PREFIX, 'Checking asset', asset['id'], asset['url']);

                        const assetInstall = async function () {
                            element.off('click');
                            label.removeClass('fa-download');
                            this.classList.add('asset-download-button-loading');
                            await installAsset(asset['url'], assetType, asset['id']);
                            label.addClass('fa-check');
                            this.classList.remove('asset-download-button-loading');
                            element.on('click', assetDelete);
                            element.on('mouseenter', function () {
                                label.removeClass('fa-check');
                                label.addClass('fa-trash');
                                label.addClass('redOverlayGlow');
                            }).on('mouseleave', function () {
                                label.addClass('fa-check');
                                label.removeClass('fa-trash');
                                label.removeClass('redOverlayGlow');
                            });
                        };

                        const assetDelete = async function () {
                            if (assetType === 'character') {
                                toastr.error('Go to the characters menu to delete a character.', 'Character deletion not supported');
                                await executeSlashCommands(`/go ${asset['id']}`);
                                return;
                            }
                            element.off('click');
                            await deleteAsset(assetType, asset['id']);
                            label.removeClass('fa-check');
                            label.removeClass('redOverlayGlow');
                            label.removeClass('fa-trash');
                            label.addClass('fa-download');
                            element.off('mouseenter').off('mouseleave');
                            element.on('click', assetInstall);
                        };

                        if (isAssetInstalled(assetType, asset['id'])) {
                            console.debug(DEBUG_PREFIX, 'installed, checked');
                            label.toggleClass('fa-download');
                            label.toggleClass('fa-check');
                            element.addClass('asset-installed');
                            element.on('click', assetDelete);
                            element.on('mouseenter', function () {
                                label.removeClass('fa-check');
                                label.addClass('fa-trash');
                                label.addClass('redOverlayGlow');
                            }).on('mouseleave', function () {
                                label.addClass('fa-check');
                                label.removeClass('fa-trash');
                                label.removeClass('redOverlayGlow');
                            });
                        }
                        else {
                            console.debug(DEBUG_PREFIX, 'not installed, unchecked');
                            element.prop('checked', false);
                            element.on('click', assetInstall);
                        }

                        console.debug(DEBUG_PREFIX, 'Created element for ', asset['id']);

                        const displayName = DOMPurify.sanitize(asset['name'] || asset['id']);
                        const description = DOMPurify.sanitize(asset['description'] || '');
                        const url = isValidUrl(asset['url']) ? asset['url'] : '';
                        const thumb = isValidUrl(asset['thumb']) ? `background-image:url('${asset['thumb']}');` : '';
                        const title = assetType === 'extension' ? `Extension repo/guide: ${url}` : 'Preview in browser';
                        const previewIcon = (assetType === 'extension' || assetType === 'character') ? 'fa-arrow-up-right-from-square' : 'fa-headphones-simple';
                        const tags = asset['tags'] ?? [];
                        const author = asset['author'] ?? {
                            name: new URL(url).pathname.split('/')[1],
                            url: url.split('/').slice(0, -1).join('/'),
                        };

                        const assetBlock = $('<i></i>');
                        if (assetType == 'extension') {
                            assetBlock.attr('data-type', 'extension');
                            const github = $(`<a target="_blank" href="${url}" class="asset-github fa-fw fa-brands fa-github fa-lg"></a>`)
                                .attr('title', 'Open on GitHub')
                            ;
                            const readme = $('<div class="asset-readme fa-regular fa-book-open fa-lg" title="Open Readme"></div>');
                            const actions = $('<div class="asset-actions"></div>')
                                .append(element)
                                .append(readme)
                                .append(github)
                            ;
                            assetBlock
                                .append(`
                                    <div class="asset-thumb ${thumb ? '' : 'fa-solid fa-cubes'}" style="${thumb}"></div>
                                    <div class="asset-name">${displayName}</div>
                                    <div class="asset-author">by <a href="${author.url ?? 'javascript:;'}" title="${author.url ?? ''}" target="_blank">${author.name}</a></div>
                                    <div class="asset-description">${description}</div>
                                    <div class="asset-tags">
                                        ${tags.map(tag=>`<div class="asset-tag">${tag}</div>`).join(' ')}
                                    </div>
                                `)
                                .append(actions);
                            readme.on('click', async(evt)=>{
                                evt.stopPropagation();
                                const converter = reloadMarkdownProcessor();
                                const data = await getReadme(url);
                                const md = data.md;
                                const html = `
                                    <div class="mes asset-readme-dlg"><div class="mes_text">${converter.makeHtml(md)}</div></div>
                                `;
                                const readmeDlg = new Popup(html, POPUP_TYPE.TEXT, null, { okButton:'Close', wide:true });
                                readmeDlg.dom.addEventListener('mousedown', evt=>evt.stopPropagation());
                                for (const a of Array.from(readmeDlg.text.querySelectorAll('a'))) {
                                    a.target = '_blank';
                                    if (a.href.startsWith('/')) a.href = `https://github.com${a.href}`;
                                    else if (!a.href.includes('://')) a.href = `${url}/${a.href}`;
                                }
                                for (const el of Array.from(readmeDlg.text.querySelectorAll('[src]'))) {
                                    if (el.src.startsWith('/')) el.src = `https://github.com${el.src}`;
                                    else if (!el.src.includes('://')) el.src = `${data.baseUrl}/${el.src}`;
                                }
                                readmeDlg.show();
                            });
                        } else {
                            assetBlock
                                .append(element)
                                .append(`<div class="flex-container flexFlowColumn flexNoGap">
                                            <span class="asset-name flex-container alignitemscenter">
                                                <b>${displayName}</b>
                                                <a class="asset_preview" href="${url}" target="_blank" title="${title}">
                                                    <i class="fa-solid fa-sm ${previewIcon}"></i>
                                                </a>
                                            </span>
                                            <small class="asset-description">
                                                ${description}
                                            </small>
                                        </div>`);

                            if (assetType === 'character') {
                                assetBlock.find('.asset-name').prepend(`<div class="avatar"><img src="${asset['url']}" alt="${displayName}"></div>`);
                            }
                        }

                        assetBlock.addClass('asset-block');

                        assetTypeMenu.append(assetBlock);
                    }
                    assetTypeMenu.appendTo('#assets_menu');
                    assetTypeMenu.on('click', 'a.asset_preview', previewAsset);
                }

                filterAssets();
                $('#assets_filters').show();
                $('#assets_menu').show();
            })
            .catch((error) => {
                console.error(error);
                toastr.error('Problem with assets URL', DEBUG_PREFIX + 'Cannot get assets list');
                $('#assets-connect-button').addClass('fa-plug-circle-exclamation');
                $('#assets-connect-button').addClass('redOverlayGlow');
            });
    });
}

function previewAsset(e) {
    const href = $(this).attr('href');
    const audioExtensions = ['.mp3', '.ogg', '.wav'];

    if (audioExtensions.some(ext => href.endsWith(ext))) {
        e.preventDefault();

        if (previewAudio) {
            previewAudio.pause();

            if (previewAudio.src === href) {
                previewAudio = null;
                return;
            }
        }

        previewAudio = new Audio(href);
        previewAudio.play();
        return;
    }
}

function isAssetInstalled(assetType, filename) {
    let assetList = currentAssets[assetType];

    if (assetType == 'extension') {
        const thirdPartyMarker = 'third-party/';
        assetList = extensionNames.filter(x => x.startsWith(thirdPartyMarker)).map(x => x.replace(thirdPartyMarker, ''));
    }

    if (assetType == 'character') {
        assetList = getContext().characters.map(x => x.avatar);
    }

    for (const i of assetList) {
        //console.debug(DEBUG_PREFIX,i,filename)
        if (i.includes(filename))
            return true;
    }

    return false;
}

async function installAsset(url, assetType, filename) {
    console.debug(DEBUG_PREFIX, 'Downloading ', url);
    const category = assetType;
    try {
        if (category === 'extension') {
            console.debug(DEBUG_PREFIX, 'Installing extension ', url);
            await installExtension(url);
            console.debug(DEBUG_PREFIX, 'Extension installed.');
            return;
        }

        const body = { url, category, filename };
        const result = await fetch('/api/assets/download', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(body),
            cache: 'no-cache',
        });
        if (result.ok) {
            console.debug(DEBUG_PREFIX, 'Download success.');
            if (category === 'character') {
                console.debug(DEBUG_PREFIX, 'Importing character ', filename);
                const blob = await result.blob();
                const file = new File([blob], filename, { type: blob.type });
                await processDroppedFiles([file], true);
                console.debug(DEBUG_PREFIX, 'Character downloaded.');
            }
        }
    }
    catch (err) {
        console.log(err);
        return [];
    }
}

async function deleteAsset(assetType, filename) {
    console.debug(DEBUG_PREFIX, 'Deleting ', assetType, filename);
    const category = assetType;
    try {
        if (category === 'extension') {
            console.debug(DEBUG_PREFIX, 'Deleting extension ', filename);
            await deleteExtension(filename);
            console.debug(DEBUG_PREFIX, 'Extension deleted.');
        }

        const body = { category, filename };
        const result = await fetch('/api/assets/delete', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(body),
            cache: 'no-cache',
        });
        if (result.ok) {
            console.debug(DEBUG_PREFIX, 'Deletion success.');
        }
    }
    catch (err) {
        console.log(err);
        return [];
    }
}

async function getReadme(extensionUrl) {
    const readmeUrl = new URL(extensionUrl);
    readmeUrl.host = 'api.github.com';
    readmeUrl.pathname = `/repos${readmeUrl.pathname}/readme`;
    let baseUrl = '';
    let md = `
## No README found.

Visit [GitHub](${extensionUrl}) for details.
    `;
    try {
        const response = await fetch(readmeUrl);
        if (response.ok) {
            const data = await response.json();
            md = decodeURIComponent(
                atob(data.content)
                    .split('')
                    .map(char=>`%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
                    .join(''),
            );
            baseUrl = data.download_url.split('/').slice(0, -1).join('/');
        }
    } catch { /* empty */ }
    return {
        md,
        baseUrl,
    };
}

//#############################//
//  API Calls                  //
//#############################//

async function updateCurrentAssets() {
    console.debug(DEBUG_PREFIX, 'Checking installed assets...');
    try {
        const result = await fetch('/api/assets/get', {
            method: 'POST',
            headers: getRequestHeaders(),
        });
        currentAssets = result.ok ? (await result.json()) : {};
    }
    catch (err) {
        console.log(err);
    }
    console.debug(DEBUG_PREFIX, 'Current assets found:', currentAssets);
}


const installButton = document.querySelector('#third_party_extension_button');
installButton.querySelector('span').textContent = 'Install extenions & assets';
installButton.setAttribute('data-assetManager', '1');
installButton.addEventListener('click', async(evt)=>{
    evt.stopImmediatePropagation();

    const dom = renderExtensionTemplate(MODULE_NAME, 'window');
    const dlg = new Popup(dom, POPUP_TYPE.TEXT, null, { okButton:'Close', wide:true, large:true });
    dlg.dom.addEventListener('mousedown', evt=>evt.stopPropagation());
    dlg.dlg.style.aspectRatio = 'unset';
    /**@type {HTMLInputElement}*/
    const thirdPartyUrl = dlg.dom.querySelector('.assets-third-party-url');
    const thirdPartyTrigger = dlg.dom.querySelector('.assets-third-party-trigger');
    thirdPartyTrigger.addEventListener('click', async()=>{
        const url = thirdPartyUrl.value?.trim();
        if (url) {
            await installExtension(url);
        }
    });
    /**@type {HTMLInputElement}*/
    const assetsJsonUrl = dlg.dom.querySelector('#assets-json-url-field');
    assetsJsonUrl.value = ASSETS_JSON_URL;
    /**@type {HTMLElement}*/
    const connectButton = dlg.dom.querySelector('#assets-connect-button');
    connectButton.addEventListener('click', async()=>{
        const url = assetsJsonUrl.value;
        const rememberKey = `Assets_SkipConfirm_${getStringHash(url)}`;
        const skipConfirm = localStorage.getItem(rememberKey) === 'true';

        const template = renderExtensionTemplate(MODULE_NAME, 'confirm', { url });
        const confirmation = skipConfirm || await callGenericPopup(template, POPUP_TYPE.CONFIRM);
        if (confirmation) {
            try {
                if (!skipConfirm) {
                    const rememberValue = Boolean($('#assets-remember').prop('checked'));
                    localStorage.setItem(rememberKey, String(rememberValue));
                }

                console.debug(DEBUG_PREFIX, 'Confimation, loading assets...');
                downloadAssetsList(url);
                connectButton.classList.remove('fa-plug-circle-exclamation');
                connectButton.classList.remove('redOverlayGlow');
                connectButton.classList.add('fa-plug-circle-check');
            } catch (error) {
                console.error('Error:', error);
                toastr.error(`Cannot get assets list from ${url}`);
                connectButton.classList.remove('fa-plug-circle-check');
                connectButton.classList.add('fa-plug-circle-exclamation');
                connectButton.classList.remove('redOverlayGlow');
            }
        }
        else {
            console.debug(DEBUG_PREFIX, 'Connection refused by user');
        }
    });
    connectButton.click();
    await dlg.show();
});

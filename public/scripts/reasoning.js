import { chat, closeMessageEditor, saveChatConditional, saveSettingsDebounced, substituteParams, updateMessageBlock } from '../script.js';
import { t } from './i18n.js';
import { MacrosParser } from './macros.js';
import { Popup } from './popup.js';
import { power_user } from './power-user.js';
import { SlashCommand } from './slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from './slash-commands/SlashCommandArgument.js';
import { commonEnumProviders } from './slash-commands/SlashCommandCommonEnumsProvider.js';
import { SlashCommandParser } from './slash-commands/SlashCommandParser.js';
import { copyText } from './utils.js';

/**
 * Gets a message from a jQuery element.
 * @param {Element} element
 * @returns {{messageId: number, message: object, messageBlock: JQuery<HTMLElement>}}
 */
function getMessageFromJquery(element) {
    const messageBlock = $(element).closest('.mes');
    const messageId = Number(messageBlock.attr('mesid'));
    const message = chat[messageId];
    return { messageId: messageId, message, messageBlock };
}

/**
 * Helper class for adding reasoning to messages.
 * Keeps track of the number of reasoning additions.
 */
export class PromptReasoning {
    static REASONING_PLACEHOLDER = '\u200B';
    static REASONING_PLACEHOLDER_REGEX = new RegExp(`${PromptReasoning.REASONING_PLACEHOLDER}$`);

    constructor() {
        this.counter = 0;
    }

    /**
     * Checks if the limit of reasoning additions has been reached.
     * @returns {boolean} True if the limit of reasoning additions has been reached, false otherwise.
     */
    isLimitReached() {
        if (!power_user.reasoning.add_to_prompts) {
            return true;
        }

        return this.counter >= power_user.reasoning.max_additions;
    }

    /**
     * Add reasoning to a message according to the power user settings.
     * @param {string} content Message content
     * @param {string} reasoning Message reasoning
     * @returns {string} Message content with reasoning
     */
    addToMessage(content, reasoning) {
        // Disabled or reached limit of additions
        if (!power_user.reasoning.add_to_prompts || this.counter >= power_user.reasoning.max_additions) {
            return content;
        }

        // No reasoning provided or a placeholder
        if (!reasoning || reasoning === PromptReasoning.REASONING_PLACEHOLDER) {
            return content;
        }

        // Increment the counter
        this.counter++;

        // Substitute macros in variable parts
        const prefix = substituteParams(power_user.reasoning.prefix || '');
        const separator = substituteParams(power_user.reasoning.separator || '');
        const suffix = substituteParams(power_user.reasoning.suffix || '');

        // Combine parts with reasoning and content
        return `${prefix}${reasoning}${suffix}${separator}${content}`;
    }
}

function loadReasoningSettings() {
    $('#reasoning_add_to_prompts').prop('checked', power_user.reasoning.add_to_prompts);
    $('#reasoning_add_to_prompts').on('change', function () {
        power_user.reasoning.add_to_prompts = !!$(this).prop('checked');
        saveSettingsDebounced();
    });

    $('#reasoning_prefix').val(power_user.reasoning.prefix);
    $('#reasoning_prefix').on('input', function () {
        power_user.reasoning.prefix = String($(this).val());
        saveSettingsDebounced();
    });

    $('#reasoning_suffix').val(power_user.reasoning.suffix);
    $('#reasoning_suffix').on('input', function () {
        power_user.reasoning.suffix = String($(this).val());
        saveSettingsDebounced();
    });

    $('#reasoning_separator').val(power_user.reasoning.separator);
    $('#reasoning_separator').on('input', function () {
        power_user.reasoning.separator = String($(this).val());
        saveSettingsDebounced();
    });

    $('#reasoning_max_additions').val(power_user.reasoning.max_additions);
    $('#reasoning_max_additions').on('input', function () {
        power_user.reasoning.max_additions = Number($(this).val());
        saveSettingsDebounced();
    });
}

function registerReasoningSlashCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'reasoning-get',
        returns: ARGUMENT_TYPE.STRING,
        helpString: t`Get the contents of a reasoning block of a message. Returns an empty string if the message does not have a reasoning block.`,
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Message ID. If not provided, the message ID of the last message is used.',
                typeList: ARGUMENT_TYPE.NUMBER,
                enumProvider: commonEnumProviders.messages(),
            }),
        ],
        callback: (_args, value) => {
            const messageId = !isNaN(Number(value)) ? Number(value) : chat.length - 1;
            const message = chat[messageId];
            const reasoning = String(message?.extra?.reasoning ?? '');
            return reasoning.replace(PromptReasoning.REASONING_PLACEHOLDER_REGEX, '');
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'reasoning-set',
        returns: ARGUMENT_TYPE.STRING,
        helpString: t`Set the reasoning block of a message. Returns the reasoning block content.`,
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'at',
                description: 'Message ID. If not provided, the message ID of the last message is used.',
                typeList: ARGUMENT_TYPE.NUMBER,
                enumProvider: commonEnumProviders.messages(),
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Reasoning block content.',
                typeList: ARGUMENT_TYPE.STRING,
            }),
        ],
        callback: async (args, value) => {
            const messageId = !isNaN(Number(args.at)) ? Number(args.at) : chat.length - 1;
            const message = chat[messageId];
            if (!message?.extra) {
                return '';
            }

            message.extra.reasoning = String(value ?? '');
            await saveChatConditional();

            closeMessageEditor('reasoning');
            updateMessageBlock(messageId, message);
            return message.extra.reasoning;
        },
    }));
}

function registerReasoningMacros() {
    MacrosParser.registerMacro('reasoningPrefix', () => power_user.reasoning.prefix, t`Reasoning Prefix`);
    MacrosParser.registerMacro('reasoningSuffix', () => power_user.reasoning.suffix, t`Reasoning Suffix`);
    MacrosParser.registerMacro('reasoningSeparator', () => power_user.reasoning.separator, t`Reasoning Separator`);
}

function setReasoningEventHandlers(){
    $(document).on('click', '.mes_reasoning_copy', (e) => {
        e.stopPropagation();
        e.preventDefault();
    });

    $(document).on('click', '.mes_reasoning_edit', function (e) {
        e.stopPropagation();
        e.preventDefault();
        const { message, messageBlock } = getMessageFromJquery(this);
        if (!message?.extra) {
            return;
        }

        const reasoning = String(message?.extra?.reasoning ?? '');
        const chatElement = document.getElementById('chat');
        const textarea = document.createElement('textarea');
        const reasoningBlock = messageBlock.find('.mes_reasoning');
        textarea.classList.add('reasoning_edit_textarea');
        textarea.value = reasoning.replace(PromptReasoning.REASONING_PLACEHOLDER_REGEX, '');
        $(textarea).insertBefore(reasoningBlock);

        if (!CSS.supports('field-sizing', 'content')) {
            const resetHeight = function () {
                const scrollTop = chatElement.scrollTop;
                textarea.style.height = '0px';
                textarea.style.height = `${textarea.scrollHeight}px`;
                chatElement.scrollTop = scrollTop;
            };

            textarea.addEventListener('input', resetHeight);
            resetHeight();
        }

        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        const textareaRect = textarea.getBoundingClientRect();
        const chatRect = chatElement.getBoundingClientRect();

        // Scroll if textarea bottom is below visible area
        if (textareaRect.bottom > chatRect.bottom) {
            const scrollOffset = textareaRect.bottom - chatRect.bottom;
            chatElement.scrollTop += scrollOffset;
        }
    });

    $(document).on('click', '.mes_reasoning_edit_done', async function (e) {
        e.stopPropagation();
        e.preventDefault();
        const { message, messageId, messageBlock } = getMessageFromJquery(this);
        if (!message?.extra) {
            return;
        }

        const textarea = messageBlock.find('.reasoning_edit_textarea');
        const reasoning = String(textarea.val());
        message.extra.reasoning = reasoning;
        await saveChatConditional();
        updateMessageBlock(messageId, message);
        textarea.remove();
    });

    $(document).on('click', '.mes_reasoning_edit_cancel', function (e) {
        e.stopPropagation();
        e.preventDefault();

        const { messageBlock } = getMessageFromJquery(this);
        const textarea = messageBlock.find('.reasoning_edit_textarea');
        textarea.remove();
    });

    $(document).on('click', '.mes_edit_add_reasoning', async function () {
        const { message, messageId } = getMessageFromJquery(this);
        if (!message?.extra) {
            return;
        }

        if (message.extra.reasoning) {
            toastr.info(t`Reasoning already exists.`, t`Edit Message`);
            return;
        }

        message.extra.reasoning = PromptReasoning.REASONING_PLACEHOLDER;
        await saveChatConditional();
        closeMessageEditor();
        updateMessageBlock(messageId, message);
    });

    $(document).on('click', '.mes_reasoning_delete', async function (e) {
        e.stopPropagation();
        e.preventDefault();

        const confirm = await Popup.show.confirm(t`Are you sure you want to clear the reasoning?`, t`Visible message contents will stay intact.`);

        if (!confirm) {
            return;
        }

        const { message, messageId } = getMessageFromJquery(this);
        if (!message?.extra) {
            return;
        }
        message.extra.reasoning = '';
        await saveChatConditional();
        updateMessageBlock(messageId, message);
    });

    $(document).on('pointerup', '.mes_reasoning_copy', async function () {
        const { message } = getMessageFromJquery(this);
        const reasoning = String(message?.extra?.reasoning ?? '').replace(PromptReasoning.REASONING_PLACEHOLDER_REGEX, '');

        if (!reasoning) {
            return;
        }

        await copyText(reasoning);
        toastr.info(t`Copied!`, '', { timeOut: 2000 });
    });
}

export function initReasoning() {
    loadReasoningSettings();
    setReasoningEventHandlers();
    registerReasoningSlashCommands();
    registerReasoningMacros();
}

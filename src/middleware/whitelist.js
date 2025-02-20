import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import Handlebars from 'handlebars';
import ipMatching from 'ip-matching';

import { getIpFromRequest } from '../express-common.js';
import { color, getConfigValue, safeReadFileSync } from '../util.js';

const whitelistPath = path.join(process.cwd(), './whitelist.txt');
const enableForwardedWhitelist = getConfigValue('enableForwardedWhitelist', false, 'boolean');
let whitelist = getConfigValue('whitelist', []);
let knownIPs = new Set();

export const getAccessLogPath = () => path.join(globalThis.DATA_ROOT, 'access.log');

if (fs.existsSync(whitelistPath)) {
    try {
        let whitelistTxt = fs.readFileSync(whitelistPath, 'utf-8');
        whitelist = whitelistTxt.split('\n').filter(ip => ip).map(ip => ip.trim());
    } catch (e) {
        // Ignore errors that may occur when reading the whitelist (e.g. permissions)
    }
}

/**
 * Get the client IP address from the request headers.
 * @param {import('express').Request} req Express request object
 * @returns {string|undefined} The client IP address
 */
function getForwardedIp(req) {
    if (!enableForwardedWhitelist) {
        return undefined;
    }

    // Check if X-Real-IP is available
    if (req.headers['x-real-ip']) {
        return req.headers['x-real-ip'].toString();
    }

    // Check for X-Forwarded-For and parse if available
    if (req.headers['x-forwarded-for']) {
        const ipList = req.headers['x-forwarded-for'].toString().split(',').map(ip => ip.trim());
        return ipList[0];
    }

    // If none of the headers are available, return undefined
    return undefined;
}

export function migrateAccessLog() {
    try {
        if (!fs.existsSync('access.log')) {
            return;
        }
        const logPath = getAccessLogPath();
        if (fs.existsSync(logPath)) {
            return;
        }
        fs.renameSync('access.log', logPath);
        console.log(color.yellow('Migrated access.log to new location:'), logPath);
    } catch (e) {
        console.error('Failed to migrate access log:', e);
        console.info('Please move access.log to the data directory manually.');
    }
}

/**
 * Returns a middleware function that checks if the client IP is in the whitelist.
 * @param {boolean} whitelistMode If whitelist mode is enabled via config or command line
 * @param {boolean} listen If listen mode is enabled via config or command line
 * @returns {import('express').RequestHandler} The middleware function
 */
export default function whitelistMiddleware(whitelistMode, listen) {
    const forbiddenWebpage = Handlebars.compile(
        safeReadFileSync('./public/error/forbidden-by-whitelist.html') ?? '',
    );

    return function (req, res, next) {
        const clientIp = getIpFromRequest(req);
        const forwardedIp = getForwardedIp(req);
        const userAgent = req.headers['user-agent'];

        if (listen && !knownIPs.has(clientIp)) {
            console.info(color.yellow(`New connection from ${clientIp}; User Agent: ${userAgent}\n`));
            knownIPs.add(clientIp);

            // Write access log
            const logPath = getAccessLogPath();
            const timestamp = new Date().toISOString();
            const log = `${timestamp} ${clientIp} ${userAgent}\n`;
            fs.appendFile(logPath, log, (err) => {
                if (err) {
                    console.error('Failed to write access log:', err);
                }
            });
        }

        //clientIp = req.connection.remoteAddress.split(':').pop();
        if (whitelistMode === true && !whitelist.some(x => ipMatching.matches(clientIp, ipMatching.getMatch(x)))
            || forwardedIp && whitelistMode === true && !whitelist.some(x => ipMatching.matches(forwardedIp, ipMatching.getMatch(x)))
        ) {
            // Log the connection attempt with real IP address
            const ipDetails = forwardedIp
                ? `${clientIp} (forwarded from ${forwardedIp})`
                : clientIp;
            console.warn(
                color.red(
                    `Blocked connection from ${clientIp}; User Agent: ${userAgent}\n\tTo allow this connection, add its IP address to the whitelist or disable whitelist mode by editing config.yaml in the root directory of your SillyTavern installation.\n`,
                ),
            );
            return res.status(403).send(forbiddenWebpage({ ipDetails }));
        }
        next();
    };
}

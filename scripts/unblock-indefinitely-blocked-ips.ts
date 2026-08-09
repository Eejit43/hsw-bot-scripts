import { Mwn } from 'mwn';
import { getIndefinitelyBlockedIps } from '../functions';

/**
 * This script is used to batch move a list of pages to new titles, leaving redirects.
 * @param mwn The Mwn instance.
 */
export default async function main(mwn: Mwn) {
    const ips = await getIndefinitelyBlockedIps(mwn);

    if (ips.length === 0) {
        Mwn.log('[W] No IPs to unblock. Exiting.');
        return;
    }

    const result = await mwn.batchOperation(
        ips,
        async (ip) => {
            const user = new mwn.User(ip);

            await user.unblock({ reason: 'Unblocking indefinitely blocked IP address' });

            Mwn.log(`[S] Successfully unblocked IP address ${ip}`);
        },
        1,
    );

    const failures = Object.entries(result.failures);

    if (failures.length > 0) {
        const successfulAmount = ips.length - failures.length;

        const mappedFailures = failures.map(([ip, error]) => ` - ${ip} failed with error: ${error}`).join('\n');

        Mwn.log(
            `[W] Successfully unblocked ${successfulAmount} IP ${successfulAmount === 1 ? 'address' : 'addresses'}, but ${failures.length} ${failures.length === 1 ? 'failure' : 'failures'} occurred:\n${mappedFailures}`,
        );
    } else Mwn.log(`[S] Successfully unblocked ${ips.length} IP ${ips.length === 1 ? 'address' : 'addresses'}!`);
}

export async function main(ns) {
    const servers = ns.getPurchasedServers();
    const maxRam = ns.getPurchasedServerMaxRam();
    let myMoney = ns.getServerMoneyAvailable("home");

    for (const server of servers) {
        ns.print("Upgrading server ", server, '...')
        let currentRam = ns.getServerMaxRam(server) / 1024;

        if(currentRam == maxRam){
            ns.print('  The server has the max possible ram of ', maxRam, 'GB.');
            continue;
        }

        ns.print('  The server has ', currentRam, 'GB ram. Upgrading to ', maxRam, 'GB ram.');

        //let upgradeCost = 0;
        //let nextUpgrade = 0;

        // while(currentRam !== maxRam){
        //     let nextUpgrade = currentRam * 2;
        //     let upgradeCost = await ns.getPurchasedServerUpgradeCost(server, nextUpgrade);

        //     while(upgradeCost > myMoney){
        //         ns.print("  Current money of ", myMoney, " is not enough to buy the ", nextUpgrade, "GB upgrade for ", upgradeCost, '.');
        //         myMoney = ns.getServerMoneyAvailable("home");
        //         await ns.sleep("10000");
        //     }
            
        //     ns.print('  Making upgrade order.');
        //     while(upgradeCost < myMoney && nextUpgrade <= maxRam){
        //         nextUpgrade = nextUpgrade * 2;
        //         upgradeCost = await ns.getPurchasedServerUpgradeCost(server, nextUpgrade);
        //     }
        //     nextUpgrade = nextUpgrade / 2
        //     upgradeCost = await ns.getPurchasedServerUpgradeCost(server, nextUpgrade);

        //     ns.print('  Buying upgrade for $', upgradeCost, '.');
        //     await ns.upgradePurchasedServer(server, nextUpgrade);

        //     currentRam = nextUpgrade;
        // }
        ns.upgradePurchasedServer(server, ns.getPurchasedServerMaxRam());
    }
}

// upgradePurchasedServer(hostname, ram)
// renamePurchasedServer(hostname, newName) 	Rename a purchased server.
// getPurchasedServerUpgradeCost(hostname, ram)
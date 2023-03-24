/** @param {NS} ns **/
export async function main(ns, numServers = ns.args[0], threads = ns.args[1] = 0) {
    ns.disableLog("scp");
    //const nServer = ns.args[0]
    let usable_RAM = 0;
    let scriptmem = ns.getScriptRam('targeted-share.js', 'home');
    let totalThreads = 0;

    if (numServers == "kill" || numServers == "Kill" || numServers == "KILL" || numServers == "0") {
        numServers = ns.getPurchasedServers().length
        ns.print("Killing all targeted-shares.js scripts on all (",numServers,") purchased server(s)");
        for (let i = 0; i < numServers; i++) { 
            const hostServer = 'AcEcore-' + i;
            const scriptlist = ns.ps(hostServer);
            for (var s = 0; s < scriptlist.length; ++s) {
                const script = scriptlist[s].filename

                if ( script == "targeted-share.js") {
                    ns.print(s, " - found script: ", script, " with ", scriptlist[s].threads, " threads and arguments : ", scriptlist[s].args );
                    const tokill = script // + " " + scriptlist[s].threads;
                    ns.kill(tokill, hostServer )
                    //ns.print("Killed script: ", tokill, " on server: ", hostServer)
                }
            } 
        }
    } else {
    
        for ( let i = 0; i < numServers; i++) { 
            const hostServer = 'AcEcore-' + i;
            usable_RAM = Math.floor(ns.getServerMaxRam(hostServer)*0.99) - ns.getServerUsedRam(hostServer);
            if (threads == 0) {
                //If no threadnumber given we will auto calculate max threads
                threads = Math.floor(usable_RAM / scriptmem);
            }
            ns.print("Added sharing power: ", ns.getFavorToDonate(), " using ", threads, " threads on server: ", hostServer, " ", i, "/", numServers);
            ns.scp('targeted-share.js', hostServer);
            ns.exec('targeted-share.js', hostServer, threads);
            totalThreads += threads;
        }
    ns.print ("Done starting up total of ", totalThreads, " threads on ", numServers, " server(s)");
    }
}     
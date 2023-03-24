/** @param {NS} ns */
export async function main(ns) {
	let n=0
    while (true) { 
        n++
        //await ns.share(target, { threads });
        await ns.share();
        ns.print( "Cycle = ", n);
    }
}
/** @param {NS} ns **/

export async function main(ns, server = ns.args[0], script = ns.args[1], ttl=ns.args[2]=3600000,  message = ns.args[3]=0 ) {
    while(true) {
    ns.print("Error on", server, "in", script, "with message", message );
    ns.sleep(ttl);
    }
}
    
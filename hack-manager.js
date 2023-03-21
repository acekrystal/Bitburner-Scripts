/** @param {NS} ns **/
import { multiscan, gainRootAccess } from "utils.js";

// List of ??
function maxElement(arr) {
	let max = 0;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] > max) {
			max = arr[i]
		}
	}

	let maxE = arr.indexOf(max);
	return maxE
};

// List of best targets
export function best_target(ns, arr) {
    ns.print ("\\ Making best_target list");
	let list = [];
	let results = [];
	let little_results = [];
	arr.forEach(server => {
		if (!ns.hasRootAccess(server)) {
			gainRootAccess(ns, server);
		}

		if (ns.hasRootAccess(server) && ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() && server != 'home' && !ns.getPurchasedServers().includes(server) && ns.getServerMoneyAvailable(server)) {
			list.push(server);
            ns.print ("\\ Adding potential server ", server, "to the list");
		}
	})


	list.forEach((target, i) => {
		results[i] = ns.getServerMaxMoney(target);
		little_results[i] = ns.getServerMaxMoney(target) * ns.hackAnalyze(target);
	})

	return [list[maxElement(results)], list[maxElement(little_results)]];
};

// runs grow and weaken from home targeting server to prep for best value's?
async function little_prep(ns, hack_target, wt, gt, reserved_RAM) {
    ns.print("Prepping target ", hack_target);
    await ns.sleep("8000");
	const full_list = multiscan(ns, 'home');
	let host_servers = [];
	for (let i = 0; i < full_list.length; i++) {
		const server = full_list[i];
        ns.print("trying to upload prep scripts to ", server);
        //await ns.sleep("100");
		if (ns.hasRootAccess(server)) {
			//await ns.scp('targeted-grow.js', 'home', server);
			//await ns.scp('targeted-weaken.js', 'home', server);
            await ns.scp('targeted-grow.js', server);
			await ns.scp('targeted-weaken.js', server);
			host_servers.push(server);
            ns.print("Uploading to ", server, " -> DONE :3");
            await ns.sleep("500");
		}
	}
	let usable_RAM = 0;
	let needed_RAM = ns.getScriptRam('targeted-weaken.js', 'home') * wt + ns.getScriptRam('targeted-grow.js', 'home') * gt;
	let c = 1;
	host_servers.forEach(host => {
		if (host == 'home') {
			let home_ram = ns.getServerMaxRam('home') - ns.getServerUsedRam('home') - reserved_RAM;
			if (home_ram > 0) {
				usable_RAM += home_ram;
			}
		}
		else {
			usable_RAM += ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
		}
	})
	let startTime = Date.now();
	while (needed_RAM * c > usable_RAM) {
		c -= .001;
        ns.print("Needed RAM", needed_RAM * c, " to big for usable RAM ", usable_RAM);
		await ns.sleep(1);
		if (Date.now() > startTime + 320000) {
			throw(Error("line 65, loop longer than 3 minutes either need more RAM or change value of c decrement"));
		}
	}

	let weaken_threads = Math.floor(wt * c);
	let grow_threads = Math.floor(gt * c);
    

	if (weaken_threads < 1 || grow_threads < 1) {
		ns.print(weaken_threads, grow_threads);
		return 0;
	}

	for (let i = 0; i < host_servers.length; i++) {
		var server = host_servers[i]; //was const, but why if we change this every loop?
		let threads = 0;
        ns.print("// starting threads for ", host_servers[i]);
		if (weaken_threads > 0) {
			if (server == 'home') {
				threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - reserved_RAM) / ns.getScriptRam('targeted-weaken.js', 'home'));
			}
			else {
				threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / ns.getScriptRam('targeted-weaken.js', 'home'));
			}
			if (threads > weaken_threads) {
				threads = Math.floor(weaken_threads);
			}
			if (threads >= 1) {
				ns.exec('targeted-weaken.js', server, threads, threads, hack_target);
				weaken_threads -= threads;
				await ns.sleep(10);
			}
		}
		if (grow_threads > 0) {
			if (server == 'home') {
				threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - reserved_RAM) / ns.getScriptRam('targeted-grow.js', 'home'));
			}
			else {
				threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / ns.getScriptRam('targeted-grow.js', 'home'));
			}
			if (threads > grow_threads) {
				threads = Math.floor(grow_threads);
			}
			if (threads >= 1) {
				ns.exec('targeted-grow.js', server, threads, threads, 0, hack_target);
				grow_threads -= threads;
				await ns.sleep(10);
			}
		}
	}
};

async function little_hack(ns, hack_target, weaken_threads, grow_threads, hack_threads, reserved_RAM) {
	ns.print("// Starting little_hack")
    let testloopnr =0;
    await ns.sleep("2500");
    const full_list = multiscan(ns, 'home');
	let host_servers = [];
	for (let i = 0; i < full_list.length; i++) {
		var server = full_list[i]; //was const, but why if we change this every loop?
        ns.print("trying to upload hack scripts to ", server);
        //await ns.sleep("100");
		if (ns.hasRootAccess(server)) {
			//await ns.scp('targeted-hack.js', 'home', server);
			//await ns.scp('targeted-grow.js', 'home', server);
			//await ns.scp('targeted-weaken.js', 'home', server);
            await ns.scp('targeted-hack.js', server);
			await ns.scp('targeted-grow.js', server);
			await ns.scp('targeted-weaken.js', server);
			host_servers.push(server);
            ns.print("Uploading to ", server, " -> DONE :3");
            await ns.sleep("500");
		}
	}
	let usable_RAM = 0;
	let c = 2;
	host_servers.forEach(host => {
		if (host == 'home') {
			let home_ram = ns.getServerMaxRam('home') - ns.getServerUsedRam('home') - reserved_RAM;
			if (home_ram > 0) {
				usable_RAM += home_ram;
			}
		}
		else {
			usable_RAM += ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
		}
	})
	let sec_increase;
	let startTime = Date.now();
	while(grow_threads * ns.getScriptRam('targeted-grow.js', 'home') + hack_threads * ns.getScriptRam('targeted-hack.js', 'home') + weaken_threads * ns.getScriptRam('targeted-weaken.js', 'home') > usable_RAM - host_servers.length) {
		c += 1;
		grow_threads = Math.floor(ns.growthAnalyze(hack_target, 1 / (1 - 1 / c)));
        //For some reason it does not round threads correctly, this is a quick fix
        var test_grow_threads = grow_threads - Math.floor(grow_threads);
        if ( test_grow_threads > 0 ) {
            //throw(Error("Rounding issue on hack_threads left ", test_hack_threads));
            ns.print("Error in rounding 1st grow_threads, fixing number ", grow_threads);
            grow_threads = Math.floor(grow_threads);
            ns.print("(re-)Rounded grow_threads to ", grow_threads);
            await ns.sleep("5000");
        }
		hack_threads = Math.floor(ns.hackAnalyzeThreads(hack_target, ns.getServerMoneyAvailable(hack_target) / c)) / ns.hackAnalyzeChance(hack_target);
		//For some reason it does not round threads correctly, this is a quick fix
        var test_hack_threads = hack_threads - Math.floor(hack_threads);
        if ( test_hack_threads > 0 ) {
            //throw(Error("Rounding issue on hack_threads left ", test_hack_threads));
            ns.print("Error in rounding 1st hack_threads, fixing number ", hack_threads);
            hack_threads = Math.floor(hack_threads);
            ns.print("(re-)Rounded hack_threads to ", hack_threads);
            await ns.sleep("5000");
        }
        sec_increase = ns.hackAnalyzeSecurity(hack_threads) + ns.growthAnalyzeSecurity(grow_threads);
		weaken_threads = 1;
		while (ns.weakenAnalyze(weaken_threads) < sec_increase * 1.1) {
			weaken_threads += 3;
            ns.print("// 1st increasing weaken_threads for ", hack_target," to ", weaken_threads);
			await ns.sleep(1);
		}
        ns.print("// ??? usableRam problem?", hack_target);
		await ns.sleep(1);
		if (Date.now() > startTime + 240000) {
			throw(Error("line 65, loop longer than 2 minutes either need more RAM or change value of c decrement"));
		}
	}

	if (hack_threads < 1 || weaken_threads < 1 || grow_threads < 1) {
		ns.print(hack_threads, weaken_threads, grow_threads);
		return 0;
	}

	for (let i = 0; i < host_servers.length; i++) {
		var server = host_servers[i]; //was const, but why if we change this every loop?
		let threads = 0;
		let n = 0;
        

		while (ns.getServerMaxRam(server) - ns.getServerUsedRam(server) > ns.getScriptRam('targeted-weaken.js', 'home')) {
			if (weaken_threads > 0) {
				if (server == 'home') {
					threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - reserved_RAM) / ns.getScriptRam('targeted-weaken.js', 'home'));
				}
				else {
					threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / ns.getScriptRam('targeted-weaken.js', 'home'));
				}
				if (threads > weaken_threads) {
					threads = weaken_threads;
				}
				if (threads >= 1) {
					ns.exec('targeted-weaken.js', server, threads, threads, hack_target, n);
					weaken_threads -= threads;
					await ns.sleep(5);
				}
			}
			if (grow_threads > 0) {
				if (server == 'home') {
					threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - reserved_RAM) / ns.getScriptRam('targeted-grow.js', 'home'));
				}
				else {
					threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / ns.getScriptRam('targeted-grow.js', 'home'));
				}
				if (threads > grow_threads) {
					threads = grow_threads;
				}
				if (threads >= 1) {
					ns.exec('targeted-grow.js', server, threads, threads, ns.getWeakenTime(hack_target) - ns.getGrowTime(hack_target) - 500, hack_target, n);
					grow_threads -= threads;
					await ns.sleep(5);
				}
			}
			if (hack_threads > 0) {
				if (server == 'home') {
					threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - reserved_RAM) / ns.getScriptRam('targeted-hack.js', 'home'));
                }
				else {
					threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / ns.getScriptRam('targeted-hack.js', 'home'));
				}
				if (threads > hack_threads) {
					threads = hack_threads;
				}
				if (threads >= 1) {
					ns.exec('targeted-hack.js', server, threads, threads, ns.getWeakenTime(hack_target) - ns.getHackTime(hack_target) + 500, hack_target, n, threads);
					hack_threads -= threads;
					await ns.sleep(5);
				}
			}
			if (!weaken_threads && !grow_threads && !hack_threads) {
				hack_threads = Math.floor(ns.hackAnalyzeThreads(hack_target, ns.getServerMoneyAvailable(hack_target) / c));
                //For some reason it does not round hack_threads correctly, this is a quick fix
                var test_hack_threads = hack_threads - Math.floor(hack_threads);
                if ( test_hack_threads > 0 ) { 
                    //throw(Error("Rounding issue on hack_threads left ", test_hack_threads));
                    ns.print("Error in rounding 2nd hack_threads, fixing number ", hack_threads);
                    hack_threads = Math.floor(hack_threads);
                    ns.print("(re-)Rounded hack_threads to ", hack_threads);
                    //await ns.sleep("5000");
                }
                grow_threads = Math.floor(ns.growthAnalyze(hack_target, 1 / (1 - 1 / c)));
                //For some reason it does not round threads correctly, this is a quick fix
                var test_grow_threads = grow_threads - Math.floor(grow_threads);
                if ( test_grow_threads > 0 ) {
                    //throw(Error("Rounding issue on hack_threads left ", test_hack_threads));
                    ns.print("Error in rounding 1st grow_threads, fixing number ", grow_threads);
                    grow_threads = Math.floor(grow_threads);
                    ns.print("(re-)Rounded grow_threads to ", grow_threads);
                    await ns.sleep("5000");
                }
				sec_increase = ns.hackAnalyzeSecurity(hack_threads) + ns.growthAnalyzeSecurity(grow_threads);
				weaken_threads = 1;
				while (ns.weakenAnalyze(weaken_threads) < sec_increase * 1.1) {
					weaken_threads += 3;
                    ns.print("// 2nd increasing weaken_threads for ", hack_target," ", weaken_threads);
					await ns.sleep(1);
				}
				n++;
				await ns.sleep(1500);
			}
            testloopnr += 1;
            ns.print("LittleHack loop done for ", hack_target, " ", testloopnr, " n= ", n);
            ns.print("Open: threads ", threads, " hack ", hack_threads, " grow ", grow_threads, ' weaken ', weaken_threads);
			await ns.sleep(1);
		}
	}
};

export async function main(ns) {
	let reserved_RAM = ns.args[0];
	if (reserved_RAM == null) {
		reserved_RAM = 0;
	}
	while (true) {
		let full_list = multiscan(ns, 'home');
        ns.print ("//Scanning for targets");
		// finds most profitable server to target
		const targets = best_target(ns, full_list);
        await ns.sleep(5000); //added for readability on startup
		const hack_target = targets[0];
		const little_target = targets[1];

		// determines threads needed for grow hack and weaken to maintain optimal profit
		const grow_threads = Math.floor(ns.growthAnalyze(hack_target, 2));
        //For some reason it does not round threads correctly, this is a quick fix
        var test_grow_threads = grow_threads - Math.floor(grow_threads);
        if ( test_grow_threads > 0 ) {
            //throw(Error("Rounding issue on hack_threads left ", test_hack_threads));
            ns.print("Error in rounding determining grow_threads, fixing number ", grow_threads);
            grow_threads = Math.floor(grow_threads);
            ns.print("(re-)Rounded grow_threads to ", grow_threads);
            await ns.sleep("5000");
        }
		const hack_threads = Math.floor(ns.hackAnalyzeThreads(hack_target, ns.getServerMoneyAvailable(hack_target) / 2));
		const sec_increase = ns.hackAnalyzeSecurity(hack_threads) + ns.growthAnalyzeSecurity(grow_threads);
		let weaken_threads = 1;
		
		while (ns.weakenAnalyze(weaken_threads) < sec_increase * 1.1) {
			weaken_threads += 5;
            ns.print("// weakenAnalyze, needed threads :", weaken_threads);
			await ns.sleep(1);
		}

		// determines needed RAM for a cycle of grow weaken hack with determined threads
		const needed_ram = (grow_threads * ns.getScriptRam('targeted-grow.js', 'home') + hack_threads * ns.getScriptRam('targeted-hack.js', 'home') + weaken_threads * ns.getScriptRam('targeted-weaken.js', 'home'));

		// goes through Purchased servers and creates list of servers with enough RAM to utilize 
		// note only Purchased servers are going to reliably have enough RAM
		let purchased_servers = ns.getPurchasedServers();
		let host_servers = [];

		purchased_servers.forEach(server => {
			if (ns.getServerMaxRam(server) - ns.getServerUsedRam(server) >= needed_ram) {
				host_servers.push(server);
			}
		})

		if (ns.getServerMaxRam('home') - ns.getServerUsedRam('home') - reserved_RAM >= needed_ram) {
			host_servers.push('home');
		}

		if (host_servers.length == 0) {
			// prepares target to be hacked uses home to weaken and grow server to required initial conditions
			const initial_growth_amount = .5 * ns.getServerMaxMoney(little_target) / ns.getServerMoneyAvailable(little_target);
			let gt = 0;

			if (initial_growth_amount > 1 && isFinite(initial_growth_amount)) {
				gt = ns.growthAnalyze(little_target, initial_growth_amount);
			}

			let wt = 0;
			while (ns.weakenAnalyze(wt) < ns.getServerSecurityLevel(little_target) + ns.growthAnalyzeSecurity(gt) - ns.getServerMinSecurityLevel(little_target)) {
				wt++;
			}
			if (wt == 0) {
				wt = 1;
			}

			let prep = 1;
			const prep_RAM = ns.getScriptRam('targeted-grow.js', 'home') * gt + ns.getScriptRam('targeted-weaken.js', 'home') * wt;
			const prep_server = host_servers.find(server => {
				if (server == 'home') {
					return ns.getServerMaxRam('home') - ns.getServerUsedRam('home') - reserved_RAM >= prep_RAM;
				}
				else {
					return ns.getServerMaxRam(server) - ns.getServerUsedRam(server) >= prep_RAM
				}
			});

			if (prep_server == null) {
				prep = 0;
			}

			if (prep) {
                ns.print("// Prepping home (using home?)", prep_server);
                //await little_prep(ns, little_target, wt, gt, reserved_RAM); //Prep also a server when newly added?
                await ns.sleep("8000");
				if (gt > 1) {
					ns.exec('targeted-grow.js', prep_server, gt, gt, 0, little_target);
					ns.exec('targeted-weaken.js', prep_server, wt, wt, little_target);
					await ns.sleep(ns.getWeakenTime(little_target) + 1000);
				}

				else if (ns.getServerSecurityLevel(little_target) > ns.getServerMinSecurityLevel(little_target) * 1.5) {
					ns.exec('targeted-weaken.js', prep_server, wt, wt, little_target);
					await ns.sleep(ns.getWeakenTime(little_target) + 1000);
				}
			}

			else if (gt > 1 || ns.getServerSecurityLevel(little_target) > ns.getServerMinSecurityLevel(little_target) * 1.5) {
				await little_prep(ns, little_target, wt, gt, reserved_RAM);
				await ns.sleep(ns.getWeakenTime(little_target) + 1000);
			}

			await little_hack(ns, little_target, weaken_threads, grow_threads, hack_threads, reserved_RAM);
			await ns.sleep(ns.getWeakenTime(little_target) + 1000);
		}

		else {
			// prepares target to be hacked uses home to weaken and grow server to required initial conditions
			const initial_growth_amount = .5 * ns.getServerMaxMoney(hack_target) / ns.getServerMoneyAvailable(hack_target);
			let gt = 0;
			if (initial_growth_amount > 1) {
				gt = ns.growthAnalyze(hack_target, initial_growth_amount);
			}

			let wt = 0;
			while (ns.weakenAnalyze(wt) < ns.getServerSecurityLevel(hack_target) + ns.growthAnalyzeSecurity(gt) - ns.getServerMinSecurityLevel(hack_target)) {
				wt++;
			}
			if (wt == 0) {
				wt = 1;
			}

			let prep = 1;
			const prep_RAM = ns.getScriptRam('targeted-grow.js', 'home') * gt + ns.getScriptRam('targeted-weaken.js', 'home') * wt;
			const prep_server = host_servers.find(server => {
				if (server == 'home') {
					return ns.getServerMaxRam('home') - ns.getServerUsedRam('home') - reserved_RAM >= prep_RAM;
				}
				else {
					return ns.getServerMaxRam(server) - ns.getServerUsedRam(server) >= prep_RAM
				}
			});
			if (prep_server == null) {
				prep = 0;
			}

			if (prep) {
                ns.print("// Prepping server (using servers?)", prep_server);
                await ns.scp('targeted-grow.js', prep_server);
                await ns.scp('targeted-weaken.js', prep_server);
				if (gt > 1) {
                    gt = Math.floor(gt) // dirty fix for filtering out strange decimal number errors?
					ns.exec('targeted-grow.js', prep_server, gt, gt, 0, hack_target);
					ns.exec('targeted-weaken.js', prep_server, wt, wt, hack_target);
					await ns.sleep(ns.getWeakenTime(hack_target) + 1000);
				}

				else if (ns.getServerSecurityLevel(hack_target) > ns.getServerMinSecurityLevel(hack_target) * 1.5) {
					ns.exec('targeted-weaken.js', prep_server, wt, wt, hack_target);
					await ns.sleep(ns.getWeakenTime(hack_target) + 1000);
				}
			}

			else if (gt > 1 || ns.getServerSecurityLevel(hack_target) > ns.getServerMinSecurityLevel(hack_target) * 1.5) {
				await little_prep(ns, hack_target, wt, gt, reserved_RAM);
				await ns.sleep(ns.getWeakenTime(hack_target) + 1000);
			}
			// sets a variable to keep track of time taken executing hacks in the loop
			// if a hack were initiated later than the reset time the first hack would complete changing hack times for every hack following it throwing off the sync
			// most of the time execution time doesn't take that long but this safeguards overly draining a target through desync
			let initial_time = Date.now();
			let k = 0;

			for (let i = 0; i < host_servers.length; i++) {

				let weaken_time = ns.getWeakenTime(hack_target);
				let grow_time = ns.getGrowTime(hack_target);
				let hack_time = ns.getHackTime(hack_target);
				let grow_delay = weaken_time - grow_time - 2;
				let hack_delay = weaken_time - hack_time - 1;

				// assigns a server from the host server list and determines amount of cycles possible
				let server = host_servers[i]
				let n = 0;
				if (server == 'home') {
					n = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - reserved_RAM) / needed_ram);
				}
				else {
					n = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / needed_ram);
				}

				// writes needed scripts to host server
				await ns.scp('targeted-grow.js', server);
				await ns.scp('targeted-hack.js', server);
				await ns.scp('targeted-weaken.js', server);

				// loops through a cycle of grow weaken and hack executions on the target
				// each script will complete in order of grow hack weaken 2 milliseconds apart
				while (n > 0) {
					if (Date.now() >= initial_time + ns.getHackTime(hack_target)) {
						while (ns.getServerMaxRam(host_servers[k]) - ns.getServerUsedRam(host_servers[k]) < ns.getScriptRam('targeted-weaken', 'home') * weaken_threads) {
							k++;
							if (k == host_servers.length) {
								k = 0;
								await ns.sleep(10000);
							}
						}
						ns.exec('targeted-weaken.js', host_servers[k], weaken_threads, weaken_threads, hack_target);
						await ns.sleep(weaken_time + 20);
						i = 0;
						initial_time = Date.now();
						break
					}
                    
					ns.exec('targeted-weaken.js', server, weaken_threads, weaken_threads, hack_target, n);
					ns.exec('targeted-grow.js', server, grow_threads, grow_threads, grow_delay, hack_target, n);
					ns.exec('targeted-hack.js', server, hack_threads, hack_threads, hack_delay, hack_target, n);
					await ns.sleep(3);

					n--;
				}

				await ns.sleep(5);
			}

			await ns.sleep(10);
		}
	}
    
};


// on wake-up: line 848 exec grow thread interter has many decimals
// on restat script : line 421 threads should be a positive integer, was 1088.9063020046885.
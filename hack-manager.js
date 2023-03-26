/** @param {NS} ns **/
import { multiscan, gainRootAccess } from "utils.js";

// Orders an array to have the max element at the
function maxElement(arr) {
	let max = 0;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] > max) {
			max = arr[i];
		}
	}

	let maxE = arr.indexOf(max);
	return maxE;
};

// List of best targets
// Creates server list that we can (ab)use :3
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
			ns.print("☠ (ab)usable server: ", server, " found, added to the (ab)use list. ☠ pewny hack levl of ", ns.getServerRequiredHackingLevel(server), ", just lemwy bowwow you <3");
			list.push(server);
		}
	})

	list.forEach((target, i) => {
		results[i] = ns.getServerMaxMoney(target);
		//ns.print("(ab)use list #",i, " ", target, " has $", ns.getServerMoneyAvailable(target), "/", results[i]);
		//hackanalyze shows the percentage of money you can steal with a single hack thread.
		little_results[i] = ns.getServerMaxMoney(target) * ns.hackAnalyze(target);
		ns.print("little(ab)use list #",i, " ", target," has $" , ns.getServerMoneyAvailable(target), "/", results[i], " now available p/thread ", little_results[i], " (ServerMaxMoney: ", ns.getServerMaxMoney(target), " * hackAnalyze: ", ns.hackAnalyze(target),")");
	})

	return [list[maxElement(results)], list[maxElement(little_results)]];
};

function find_needed_weaken_threads(ns, target, gt, cores=1) {
	let wt = 0;
	let toRemove_SecurityLvl = ns.getServerSecurityLevel(target) + ns.growthAnalyzeSecurity(gt) - ns.getServerMinSecurityLevel(target)
	wt = toRemove_SecurityLvl / 0.05 // An attempt to reduce number of ++ it is going to do. Currently I often se steps of 0.05 per thread
	while (ns.weakenAnalyze(wt, cores) < toRemove_SecurityLvl) {
		wt++;
		ns.print("finding needed # of weaken threads to lower security level: ", toRemove_SecurityLvl, " from ", target, ". wt:", wt, " removes:", ns.weakenAnalyze(wt, cores) );
	}
	if (wt == 0) {
		wt = 1;
	}
	return Math.floor(wt);
}

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
            await ns.sleep("1");
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
				//ns.print(host, " RAM-used: ", ns.getServerUsedRam('home') , "from ", ns.getServerMaxRam('home'), "Total usable = ", usable_RAM );
			}
		}
		else {
			usable_RAM += ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
		}
		ns.print(host, " RAM-used: ", ns.getServerUsedRam('home') , "|", ns.getServerMaxRam('home'), " Total usable found = ", usable_RAM );
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
        ns.print("// starting prepping threads for ", host_servers[i]);
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
		const server = full_list[i]; //was const, but why if we change this every loop? // I have set this back now I unerstand cont in for loops better :)
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
            await ns.sleep("1");
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
		ns.print("reducing Initial grow threads of ", grow_threads, " to ", Math.floor(ns.growthAnalyze(hack_target, 1 / (1 - 1 / c))), "deviding by C=", c );
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
		ns.print("reducing Initial hack threads of ", hack_threads, " to ", Math.floor(ns.hackAnalyzeThreads(hack_target, ns.getServerMoneyAvailable(hack_target) / c)) / ns.hackAnalyzeChance(hack_target), "deviding by C=", c );
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
		while (ns.weakenAnalyze(weaken_threads) < sec_increase * catch_up_rate) {
			weaken_threads += 3;
            //ns.print("// 1st increasing weaken_threads for ", hack_target," to ", weaken_threads);
			ns.print("// Little_Hack weakenAnalyze: ", weaken_threads, " weaken threads cancel ", ns.weakenAnalyze(weaken_threads), "sec. on target:",hack_target ," with current sec:" , sec_increase * catch_up_rate)
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
				while (ns.weakenAnalyze(weaken_threads) < sec_increase * catch_up_rate) {
					weaken_threads += 3;
                    //ns.print("// 2nd increasing weaken_threads for ", hack_target," ", weaken_threads);
					ns.print("// 2nd weakenAnalyze: ", weaken_threads, " weaken threads cancels ", ns.weakenAnalyze(weaken_threads), "sec. on target:",hack_target ," with current sec:" , sec_increase * catch_up_rate)
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

export async function main(ns, manualTarget = ns.args[0], partymode = ns.args[1]) {
	ns.disableLog("sleep");
	ns.disableLog("getHackingLevel");
	ns.disableLog("getServerRequiredHackingLevel");
	ns.disableLog("getServerUsedRam");
	ns.disableLog("getServerMaxRam");
	ns.disableLog("getServerMaxMoney");
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("getServerSecurityLevel");
	ns.disableLog("getServerMinSecurityLevel");
	ns.disableLog("scp");
	ns.print("Party mode = ", partymode)
	ns.print("manualTarget = ", manualTarget)
	
	let reserved_RAM = ns.args[0];
	if (reserved_RAM == null) {
		reserved_RAM = 0;
	}

	if (partymode == "party"){
		var catch_up_rate = 4; // 20 means we can have ~20x hack scripts firing out of order while 1 weaken instance has enough threads to solve this on its own.
		var multiplyMonyToMax = 20						// This will eat more RAM, but RAM does not longer seems to be the problem at this rate, corrupted execution order are.
	} else {
		var catch_up_rate = 1.1;
		var multiplyMonyToMax = 2
	}
	while (true) {
		let full_list = multiscan(ns, 'home');
        ns.print ("//Scanning for targets");
		// finds most profitable server to target
		const targets = best_target(ns, full_list);
		if (manualTarget == "best") {
			var hack_target = targets[0]; //set hack target to the first from the best_target list
			var little_target = targets[1]; //set little-hack target to 2nd from the best_target list
		} else {
			ns.print("Manual server targeting overwrite! Targeting : ", manualTarget);
			var hack_target = manualTarget; //set hack target to the first from the best_target list
			var little_target = manualTarget; //set little-hack target to 2nd from the best_target list
		}
		ns.print("☠ --> Main hack target: ", hack_target, " seclvl:", ns.getServerSecurityLevel(hack_target), "/", ns.getServerMinSecurityLevel(hack_target), " $", ns.getServerMoneyAvailable(hack_target), "/$", ns.getServerMaxMoney(hack_target) );
		ns.print("☠ --> Little hack target: ", little_target, " seclvl:", ns.getServerSecurityLevel(little_target), "/", ns.getServerMinSecurityLevel(little_target), " $", ns.getServerMoneyAvailable(hack_target), "/$", ns.getServerMaxMoney(hack_target) );
		await ns.sleep(5000); //added for readability on startup
		
		// Main hack target calculating  -------------------------------------------------
		// determines threads needed for grow hack and weaken to maintain optimal profit

		// Estimate how many times we need to multiply current amount of money on target to reache close to max possible money amount
		//const multiplyMonyToMax = ns.getServerMaxMoney(hack_target) / (ns.getServerMoneyAvailable(hack_target) + 0.1)
		// growthAnalyze takes how many times you want to multiply the current amount of money on target and returns how many grow_threads you need.
		//const grow_threads = Math.round( (ns.growthAnalyze(hack_target, (multiplyMonyToMax * 1.1))) );
		const grow_threads = Math.round( ns.growthAnalyze(hack_target, multiplyMonyToMax) );
        //For some reason it does not round threads correctly, this is a quick fix
        /*var test_grow_threads = grow_threads - Math.floor(grow_threads);
        if ( test_grow_threads > 0 ) {
            ns.print("Error in rounding determining grow_threads, fixing number ", grow_threads);
            grow_threads = Math.floor(grow_threads);
            ns.print("(re-)Rounded grow_threads to ", grow_threads);
			throw(Error("Error in rounding determining grow_threads, fixing number ", grow_threads));
            await ns.sleep("5000");
        }*/
		//var hack_threads = Math.floor(ns.hackAnalyzeThreads(hack_target, ns.getServerMoneyAvailable(hack_target) / 2));
		var hack_threads = Math.floor(ns.hackAnalyzeThreads(hack_target, (ns.getServerMaxMoney(hack_target) / 1.2)));
		if(hack_threads === Infinity || hack_threads < 1){
            ns.print('hack_threads = ', hack_threads, ' but should be >1! BOOO, it wasdoing manual fix'); // It seems we can get "infinity" as a return from ns.hackAnalyzeThreads when money is low ~$321
            hack_threads = 1;
        }
		
		// Calculate excpected security increase and the amount of weaken threads to cancel this. We give a catch-up-rate to catch some unexpected higher sec_increase rates
		const sec_increase = ns.hackAnalyzeSecurity(hack_threads) + ns.growthAnalyzeSecurity(grow_threads);
		let weaken_threads = 1;
		weaken_threads = Math.ceil((sec_increase * catch_up_rate) / 0.1) //initial start value for quicker finish, seems to be around 0.05 - 0.25/p 5 threads?
		
		while (ns.weakenAnalyze(weaken_threads) < sec_increase * catch_up_rate) {
			weaken_threads += 5;
            //ns.print("// weakenAnalyze, needed threads :", weaken_threads, " Analyze = ", ns.weakenAnalyze(weaken_threads), " < sec_increase of ", sec_increase * 1.1);
			ns.print("// weakenAnalyze: ", weaken_threads, " weaken threads cancel ", Math.floor((ns.weakenAnalyze(weaken_threads) * 100)) / 100, " security. This is < current expected seclvl increase of: " , sec_increase * catch_up_rate, "/(", sec_increase, ")");
			await ns.sleep(1);
		}

		// determines needed RAM for a cycle of grow, weaken, hack with determined threads
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
			// First time the script is running? Or server list is empty for some reason?
			ns.print("Do I ever see this part of code? (host_servers.length == 0)");
			await ns.sleep(999999999999999999999999999999);
			const initial_growth_amount = .5 * ns.getServerMaxMoney(little_target) / (ns.getServerMoneyAvailable(little_target) + 0.1);
			let gt = 0;

			if (initial_growth_amount > 1 && isFinite(initial_growth_amount)) {
				gt = ns.growthAnalyze(little_target, initial_growth_amount);
			}

			let wt = find_needed_weaken_threads(ns, little_target, gt);

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
					let waitTime=ns.getWeakenTime(little_target) + 1000
					//ns.print("sleeping for ", waitTime)
					ns.print("1st a prep=", prep, " sleeping for ", Math.ceil((((waitTime/1000)/60))*100)/100, " minutes, GrowThreads > 1");
					await ns.sleep(waitTime);
				}

				else if (ns.getServerSecurityLevel(little_target) > ns.getServerMinSecurityLevel(little_target) * 1.5) {
					ns.exec('targeted-weaken.js', prep_server, wt, wt, little_target);
					//await ns.sleep(ns.getWeakenTime(little_target) + 1000);
					let waitTime=ns.getWeakenTime(little_target) + 1000
					//ns.print("sleeping for ", waitTime)
					ns.print("1st b prep=", prep, " sleeping for ", Math.ceil((((waitTime/1000)/60))*100)/100, " minutes, LittleTargetSeclvl > minseclvl*1.5, weaken only");
					await ns.sleep(waitTime);
				}
			}

			else if (gt > 1 || ns.getServerSecurityLevel(little_target) > ns.getServerMinSecurityLevel(little_target) * 1.5) {
				await little_prep(ns, little_target, wt, gt, reserved_RAM);
				//await ns.sleep(ns.getWeakenTime(little_target) + 1000);
				let waitTime=ns.getWeakenTime(little_target) + 1000
				ns.print("1st c prep=", prep, " sleeping for ", Math.ceil((((waitTime/1000)/60))*100)/100, " minutes, LittleTargetSeclvl > minseclvl*1.5, little_target");
				await ns.sleep(waitTime);
			}

			await little_hack(ns, little_target, weaken_threads, grow_threads, hack_threads, reserved_RAM);
			//await ns.sleep(ns.getWeakenTime(little_target) + 1000);
			let waitTime=ns.getWeakenTime(little_target) + 1000
			ns.print("1st d prep=", prep, " sleeping for ", Math.ceil((((waitTime/1000)/60))*100)/100, " minutes, LittleTargetSeclvl > minseclvl*1.5, little_target");
			await ns.sleep(waitTime);
		}

		else {
			// prepares target to be hacked uses home to weaken and grow server to required initial conditions
			// !! grow thread calcuations seems very rudemantery, might need some looking into. Right now it can crash when available money == 0 as maxmoney can not be deviced by 0, so I added 0.1 as quick fix
			var initial_growth_amount = .5 * ns.getServerMaxMoney(hack_target) / (ns.getServerMoneyAvailable(hack_target) + 0.1);
			let gt = 0;
			if (initial_growth_amount > 1) {
				gt = ns.growthAnalyze(hack_target, initial_growth_amount);
			}

			let wt = find_needed_weaken_threads(ns, little_target, gt);

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
                ns.print("// ?? Prepping target using server ", prep_server, "target sec-level = ", ns.getServerSecurityLevel(hack_target), "/", ns.getServerMinSecurityLevel(hack_target)); // can be remote or home server
				ns.print("Server grow potential = $",ns.getServerMaxMoney(hack_target)-ns.getServerMoneyAvailable(hack_target) );
                await ns.scp('targeted-grow.js', prep_server);
                await ns.scp('targeted-weaken.js', prep_server);
				if (gt > 1) {
                    gt = Math.floor(gt) // dirty fix for filtering out strange decimal number errors?
					ns.exec('targeted-grow.js', prep_server, gt, gt, 0, hack_target);
					ns.exec('targeted-weaken.js', prep_server, wt, wt, hack_target);
					//await ns.sleep(ns.getWeakenTime(hack_target) + 1000);
					let waitTime=ns.getWeakenTime(hack_target) + 5000;
					ns.print("2nd sleeping for ", Math.ceil((((waitTime/1000)/60))*100)/100, " minutes, grow and weaken prepping");
					await ns.sleep(waitTime);
				}

				else if (ns.getServerSecurityLevel(hack_target) > ns.getServerMinSecurityLevel(hack_target) * 1.5) {
					ns.exec('targeted-weaken.js', prep_server, wt, wt, hack_target);
					//await ns.sleep(ns.getWeakenTime(hack_target) + 1000);
					let waitTime=ns.getWeakenTime(hack_target) + 5000;
					ns.print("2nd sleeping for ", Math.ceil((((waitTime/1000)/60))*100)/100, " minutes, only weaken prepping");
					await ns.sleep(waitTime);
				}
			}

			else if (gt > 1 || ns.getServerSecurityLevel(hack_target) > ns.getServerMinSecurityLevel(hack_target) * 1.5) {
				await little_prep(ns, hack_target, wt, gt, reserved_RAM);
				//wait ns.sleep(ns.getWeakenTime(hack_target) + 1000);
				let waitTime=ns.getWeakenTime(hack_target) + 1000;
				ns.print("sleeping for ", Math.ceil((((waitTime/1000)/60))*100)/100, " minutes");
				await ns.sleep(waitTime);
			}




			let initial_time = Date.now();
			let k = 0;
			ns.print("Executing script using ", host_servers.length, " servers");
			if (partymode == "party") { 
				var interval = 1
			} else {
				var interval = 25
			}

			let EstimatedHackedMoney = 0;
			let EstimatedCycleMoney = 0;
			let EstimatedCycleMoneyPossible = 0;
			let serverMaxMoney = Math.round(ns.getServerMaxMoney(hack_target));
			let TTL_weaken = 0;
			let TTL_grow = 0;
			let TTL_hack = 0;
			//let BatchLoopTime = 0
			
			// Main hack staging loop ------------------------------------------------------------ 
			for (let i = 0; i < host_servers.length; i++) {

				let weaken_time = ns.getWeakenTime(hack_target);
				let grow_time = ns.getGrowTime(hack_target);
				let hack_time = ns.getHackTime(hack_target);
				let grow_delay = weaken_time - grow_time - (interval * 2); // Finish grow 4ms before the long weaken script finishes
				let hack_delay = weaken_time - hack_time - interval; // Finish hack 2ms before the long weaken script, but 2ms after the grow script so we can take its moneyzzz
				//let LastLoopTime = Date.now(); // Keep track how long one Grow/Hack/Weaken batch take to setup
				// determines amount of cycles possible on current selected server
				let server = host_servers[i]
				let n = 0;
				if (server == 'home') {
					n = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server) - reserved_RAM) / needed_ram);
					ns.print("Server: ", server, " should handle ", n, " scripts batches of ", needed_ram, "RAM gt: ?? ht: ?? wt: ??" )
				}
				else {
					n = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / needed_ram);
					ns.print("Server: ", server, " should handle ", n, " scripts batches of ", needed_ram, "RAM gt: ?? ht: ?? wt: ??" )
				}
				let starting_n = n;
				// writes needed scripts to host server (if not already present)
				await ns.scp('targeted-grow.js', server);
				await ns.scp('targeted-hack.js', server);
				await ns.scp('targeted-weaken.js', server);

				// loops through a cycle of grow weaken and hack executions on the target
				// each script will complete in order of grow hack weaken 2 milliseconds apart
				let current_serverMaxRam = ns.getServerMaxRam(server)
				while (n > 0) {
					if ( ( current_serverMaxRam - ns.getServerUsedRam(server)) <  (needed_ram) ) {
						ns.print("Available RAM changed during staging, stopping rollout on current server and moving to next server.")
						n=0;
						break;
					} else {
						if (Date.now() >= (initial_time + grow_delay + (grow_time*1.5)  )) { // here we check if we are still starting new scripts while the first scripts start to finish, we can multiply to be sure we stop in time.
							ns.print("Stopping rolling out")
							while (ns.getServerMaxRam(host_servers[k]) - ns.getServerUsedRam(host_servers[k]) < ns.getScriptRam('targeted-weaken', 'home') * weaken_threads) {
								//?? does this part ensure we alway's run a last weaken script on a new server when we run out of staging time?
								k++;
								if (k == host_servers.length) {
									k = 0;
									await ns.sleep(10000);
								}
							}
							ns.exec('targeted-weaken.js', host_servers[k], weaken_threads, weaken_threads, hack_target);
							ns.print("Hack time = ", Math.ceil(((((ns.getHackTime(hack_target))/1000)/60))*100)/100, "min delayed with: ", Math.ceil((((hack_delay)/1000)/60)*100)/100, "min started x ", Math.ceil((((Date.now()-initial_time)/1000)/60)*100)/100," seconds ago");
							ns.print("Calculated time between first and last exec staged :", (Date.now() - (initial_time + ns.getHackTime(hack_target) ) )/1000 );
							const sleep_time = weaken_time + (hack_time) + 5000; // Min = weaken_time, hack_time gives extra time that scales with target to wait for late runners, 5 seconds give some base for lower level targets with really short hack times.
							ns.print("sleeping for equelevant of weaken (", Math.ceil(((((weaken_time)/1000)/60))*100)/100, "min) + hack(", Math.ceil(((((hack_time)/1000)/60))*100)/100, "min) + 5sec = ", Math.ceil((((sleep_time) /1000)/60)*100)/100, "min sleep, staging was interrupted as we close in on first script finishing");
							//await ns.sleep(weaken_time + 25);
							await ns.sleep(sleep_time);
							i = 0;
							initial_time = Date.now();
							EstimatedHackedMoney = 0;
							EstimatedCycleMoney = 0;
							EstimatedCycleMoneyPossible = 0;
							break;
						}
						
						/*ns.exec('targeted-weaken.js', server, weaken_threads, weaken_threads, hack_target, n);
						ns.exec('targeted-grow.js', server, grow_threads, grow_threads, grow_delay, hack_target, n);
						ns.exec('targeted-hack.js', server, hack_threads, hack_threads, hack_delay, hack_target, n); */
						// We are unsure if execution of large amount of scripts can cause the order of scripts to not be correct.
						// For this we changed the execution of scripts in order
						TTL_weaken = Math.round(( initial_time + weaken_time - Date.now())) /1000;
						ns.exec('targeted-weaken.js', server, weaken_threads, weaken_threads, hack_target, n);
						await ns.sleep(interval); 
						
						TTL_grow = Math.round(( initial_time + grow_time + grow_delay - Date.now())) /1000;
						if (partymode == "party" && n < (starting_n * 0.02) || TTL_grow < ((hack_time/1000)/8) ) {
							ns.print("Skipping: last grow sessions, (", TTL_grow, "<", ((hack_time/1000)/2), ") to help against corrupted execution orders and end cycle without needind prepping for next cycle");
						} else {
							ns.exec('targeted-grow.js', server, grow_threads, grow_threads, grow_delay, hack_target, n);
							await ns.sleep(interval);
						}

						TTL_hack = Math.round(( initial_time + hack_time + hack_delay - Date.now())) /1000;
						if (partymode == "party" && n < (starting_n * 0.04) || TTL_grow < ((hack_time/1000)/4) ) {
							ns.print("Skipping: last hack sessions to help against corrupted execution orders and end cycle without needind prepping for next cycle");
						} else {
							ns.exec('targeted-hack.js', server, hack_threads, hack_threads, hack_delay, hack_target, n);
							await ns.sleep(3*interval);
						}
						
						EstimatedHackedMoney = Math.round((ns.getServerMoneyAvailable(hack_target) * ns.hackAnalyze(hack_target))/1000000);
						EstimatedCycleMoney += EstimatedHackedMoney
						EstimatedCycleMoneyPossible += Math.round((serverMaxMoney * ns.hackAnalyze(hack_target))/1000000);
						//BatchLoopTime =  Date.now()/1000 - LastLoopTime;
						//LastLoopTime = Date.now()/1000
						await ns.print("TTL Weaken: ", TTL_weaken, "seconds ( total-start:", Math.ceil((((weaken_time/1000)/60))*100)/100, "/", (ns.getWeakenTime(hack_target)-weaken_time)/1000, " :total-live-diviation ) --- [ Sever security level = ", ns.getServerSecurityLevel(hack_target), " / ", ns.getServerMinSecurityLevel(hack_target), " ]" );
						await ns.print("TTL Grow: ", TTL_grow, "seconds ( total-start:", Math.ceil((((grow_time/1000)/60))*100)/100, "/", (ns.getGrowTime(hack_target)-grow_time)/1000, " :total-live-diviation ) --- [ Money on server = $", Math.round((ns.getServerMoneyAvailable(hack_target))/1000000)/1000,"t / ", Math.round(serverMaxMoney/1000000)/1000, "t ]" );
						await ns.print("TTL Hack: ", TTL_hack, "seconds ( total-start:", Math.ceil((((hack_time/1000)/60))*100)/100, "/", (ns.getHackTime(hack_target)-hack_time)/1000, " :total-live-diviation ) --- [  Estimated from hack +$", EstimatedHackedMoney, "m --> Total this cycle = $", EstimatedCycleMoney/1000, "t / ", EstimatedCycleMoneyPossible/1000, "t ]" );
						//await ns.print("TTL Hack: ", (initial_time + hack_time + hack_delay - Date.now()) /1000, "seconds ( total-start:", Math.ceil((((hack_time/1000)/60))*100)/100, "/", (ns.getHackTime(hack_target)-hack_time)/1000, " :total-live-diviation ) --- [ ", BatchLoopTime/1000,"s Estimated ( ", Math.round((EstimatedHackedMoney/(BatchLoopTime/1000))*100)/100, "m/s) $", EstimatedHackedMoney, "m --> Total this cycle = $", EstimatedCycleMoney, "m / ", EstimatedCycleMoneyPossible, "m ]" );

						
						n--;
					}
				}

				await ns.sleep(5);
			}

			await ns.sleep(10);
		}
	}
    
};




// on wake-up: line 848 exec grow thread interter has many decimals
// on restat script : line 421 threads should be a positive integer, was 1088.9063020046885.
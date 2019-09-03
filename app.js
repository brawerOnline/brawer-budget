//database operations (the crux of this app)
"use strict";

var windowLocation;
var productionurl = 'https://brawer.online/budget/index.html';
var testingurl = 'https://brawer.online/testing/budget/index.html';

var dataBase;
var prodDB = "Budget";
var testingDB = "Testing";

dataBase = prodDB;
windowLocation = productionurl;


var myData;
var mainRequest = window.indexedDB.open(dataBase, 1);//Budget

mainRequest.onupgradeneeded = function (event) {
    myData = event.target.result;

    var objectStore = myData.createObjectStore("bills", { autoIncrement: true });

    objectStore.createIndex("billName", "billName", { unique: false });
    objectStore.createIndex("due", "due", {unique: false});

    var payObjectStore = myData.createObjectStore("bank", { autoIncrement: false});
    

    var transObjectStore = myData.createObjectStore("transactions", { autoIncrement: true });
    transObjectStore.createIndex("envelope", "envelope", {unique: false});

    var payDataObjectStore = myData.createObjectStore("PayData", { autoIncrement: true});

};

mainRequest.onerror = function () {
    console.log("Why didn't you allow my web app to use IndexedDB?!");
};
mainRequest.onsuccess = function (event) {
    myData = event.target.result;
    
    populateBillLists();
    myData.onerror = function (event) {
        console.log("err: " + event.target.error);
    };

};





//---------------------------------------------------------------------------------front-end functions
var myGlobalBills;
var myGlobalPayData;
var myGlobalTransactions;
function setGlobals() {
	getBills().then(function (result) {
		myGlobalBills = result;
	});
	getPayData().then(function (result) {
		myGlobalPayData = result;
		
	});
	getTrans().then(function (result) {
		myGlobalTransactions = result;
	});
	
	
}
function addToDB(objectToAdd, storeToUse, key) {
	return new Promise(function(resolve) {
	    var store = storeToUse;
	    var transaction = myData.transaction([store], "readwrite");
	    var objectStore = transaction.objectStore(store, "readwrite");
	    if(store === "transactions") {
	    	var test = objectStore.count();
	    	test.onsuccess = function (t) {
	    	
		    	if(t.target.result > 1){//if using old version, update to new
	    			var transacs = [];
	    			var trans = myGlobalTransactions;
	    			var i;
	    			
	    			for(i = 0; i < trans.length; i++) {
	    				
	    				transacs.push(trans[i]);
	    			}
	    			transacs.push(objectToAdd);
	    			objectStore.clear();
	    			var transRequest = objectStore.put(transacs, 1);
			}
			else {
				var trans;
				try {
					trans = myGlobalTransactions[0];
				}
				catch(err) {
					trans = [];
				}
				
			
				if(trans.length >= 300) {//prevent storage from growing out of hand
					trans.splice(0, 1);
				}
				trans.push(objectToAdd);
				var transRequest = objectStore.put(trans, 1);
			}	
			transRequest.onsuccess = function () {
			        console.log("added " + objectToAdd + " to db");
			        return(resolve);
			    };
		}
	    }
	    else {
		if(key === undefined){
			var request = objectStore.put(objectToAdd);
		}
		else{
			var request = objectStore.put(objectToAdd, key);
		}
		
		request.onsuccess = function () {
			console.log("added " + objectToAdd + " to db");
			return(resolve);
		};
		request.onerror = function (event) {
			console.log(event.target.errorCode);
		};
		transaction.onerror = function (event) {
		
			alert("what the fuck happened here, maestro? (object adding):  " + event.target.error);
			
			if (event.target.error === "ConstraintError: Unable to add key to index 'billName': at least one key does not satisfy the uniqueness requirements.") {
			    alert("Bill name already exists.");
			}
		};
	}

	});
}


function deleteBill(billName) {


    	var transaction = myData.transaction(["bills"], "readwrite");
	var objectStore = transaction.objectStore("bills");
	var myIndex = objectStore.index('billName');
	myIndex.openCursor(billName).onsuccess = function(event) {
		var cursor = event.target.result;
		if(cursor) {
			cursor.delete();
			alert("Deleted: " + cursor.value.billName);
			window.location = windowLocation;
		}
	};
}


function getBills() {
    return new Promise (function(resolve) {


        var transaction = myData.transaction(["bills"]); 
        var objectStore = transaction.objectStore("bills");
        var request = objectStore.getAll();
        request.onerror = function(event) {

          console.log("wtf " + event.target.errorCode);
        };
        request.onsuccess = function(event) {

          return resolve(event.target.result);
        };

    });
}


function populateBillLists() {

    getBills().then(function (result) {
	    var myBills = result
	    if (myBills.length > 0) {
	        $("#varHeader").show();
	        $("#recurHeader").show();
	        $("#budgetHeader").show();
	        $("#init").remove();
	        $("#normBills").empty();
	        $("#variableEnelopes").empty();

	    myBills.sort(function (a, b) {return a.dueDate - b.dueDate;});
	    myBills.forEach(function (bill) {

	        if (bill.variable === "recurring") {
	          var remainingBal = (bill.bal - bill.amount).toFixed(2);
	          var remainingBalColored;
	          if(remainingBal < 0) {
	          	remainingBalColored = "<font color='red'> " + remainingBal + "</font>";
	          }
	          else {
	          	remainingBalColored = "<font color='green'> " + remainingBal + "</font>";
	          }
	          $("#normBills").append($("<li><a class='info_link' onclick=viewEnvelope('"+encodeURIComponent(bill.billName)+"'); data-rel='popup' data-position-to='window' data-transition='pop'><object align='left'>" + bill.billName + "</object><object align='right'> " + remainingBalColored + "</object></a><a href='#addTrans'onclick=addTransInit('"+encodeURIComponent(bill.billName)+"'); data-rel='popup' data-position-to='window' data-transition='pop'></a></li>"));
	        }
	        else {
	          $("#variableEnvelopes").append($("<li><a onclick=viewEnvelope('"+encodeURIComponent(bill.billName)+"'); data-rel='popup' data-position-to='window' data-transition='pop'><object align='left'>"+bill.billName+"</object><object align='right'>" +bill.bal+"</object></a><a href='#addTrans' onclick=addTransInit('"+encodeURIComponent(bill.billName)+"'); data-rel='popup' data-position-to='window' data-transition='pop'></a></li>"));
	        }
	        $('#normBills').listview('refresh');
	        $('#variableEnvelopes').listview('refresh');
	        showMonthlyPay();
	        setGlobals();
	    });

	    if ($("#variableEnvelopes li").length === 0) {
	        $("#varHeader").hide();
	    }


	    }
	    else {
	        if(document.cookie === "visited=true") {
	        	getPayData().then(function (result) {
	        		
	        		if(result == null){
	        			
				        $("#varHeader").hide();
				        $("#recurHeader").hide();
				        $("#budgetHeader").hide();
				        $("#normBills").append($("<li id='init'><a href='#addBudgetPay' data-transition='pop'>Create a Budget, please.</a></li>"));
		
				        $('#normBills').listview('refresh');
				}
				else {
					alert("Add bills, please.");
					$(':mobile-pagecontainer').pagecontainer('change', '#addBudgetEnvelope');
				}
		      });
		}
		else {
			document.cookie = "visited=true";
			
			$(':mobile-pagecontainer').pagecontainer('change', '#about');
		}
	    }
    });
}



function updateBill(billName, billData) {

	var transaction = myData.transaction(["bills"], "readwrite");
	var objectStore = transaction.objectStore("bills");
	var myIndex = objectStore.index('billName');
	myIndex.openCursor(billName).onsuccess = function(event) {

        var cursor = event.target.result;
        if(cursor) {

	        var requestUpdate = objectStore.put(billData, cursor.primaryKey);
	        requestUpdate.onerror = function(event) {
	            // Do something with the error
	            console.log("wtf " + event.target.errorCode);
	        };
	        requestUpdate.onsuccess = function(event) {
	            
	        };
	     }
	else {
		alert("error: no go mcfly. </br> Please contact Brawer Online with said error.");
		}
    };
}



function autoFillEnvelopes(income) {
	var income = income;	
	var numberOfPays = 0;
	var fillData = {};
	var depositsNeeded = 0;
	
	
  	var bills = myGlobalBills;
  	bills.forEach(function (bill) {
  		var variable = bill.variable;
  		var dueAmount = bill.amount;
		var bal = bill.bal;
		var totalAmountNeeded = dueAmount - bal;
	  	var billName = bill.billName;
  		var dueDate = bill.dueDate;
  		if(variable === "recurring"){
	  		var today = new Date();
	  		today.setHours(0,0,0,0);
			var dueMonth;
			var dueDay = new Date();
			dueDay.setHours(0,0,0,0);
			dueDay.setDate(dueDate);
			if(today.getDate() > dueDate) {
				var nextMonth = today.getMonth() + 1;
				if(nextMonth >= 11) {
					dueDay.setYear(today.getFullYear() + 1);
				}
				else {
					dueDay.setYear(today.getFullYear());
				}
				dueDay.setMonth(nextMonth);
	
			}
			else {
				dueDay.setMonth(today.getMonth());
				dueDay.setYear(today.getFullYear());
			}
		
			var payDat = myGlobalPayData;
			var payFreq = payDat[2];
			var payArray = payDat[1];
			
			
			
			payArray.forEach(function (payday) {
				var test = daysUntil(dueDay, payday);
				if(test >= 0) {
					numberOfPays += 1;
				}
			});
			
			if(numberOfPays > 0) {
		  		var amountToDepositRaw = totalAmountNeeded / numberOfPays;
		  		var amountToDeposit = parseFloat(amountToDepositRaw).toFixed(2);
		  		if(amountToDeposit > 0) {
		  			var dat = new Object();
		  			dat.amountToDeposit = amountToDeposit;
		  			dat.numberOfPays = numberOfPays;
		  			dat.variable = variable;
		  			fillData[billName] = dat;
		  		}
		  		depositsNeeded = (parseFloat(amountToDeposit) + parseFloat(depositsNeeded)).toFixed(2);	
		  		numberOfPays = 0;	
	  		}	
	  		else {
	  			var amountToDepositRaw = totalAmountNeeded;
		  		var amountToDeposit = parseFloat(amountToDepositRaw).toFixed(2);
		  		if(amountToDeposit > 0) {
		  			var dat = new Object();
		  			dat.amountToDeposit = amountToDeposit;
		  			dat.numberOfPays = numberOfPays;
		  			dat.variable = variable;
		  			fillData[billName] = dat;
		  		}
		  		depositsNeeded = (parseFloat(amountToDeposit) + parseFloat(depositsNeeded)).toFixed(2);		
		  		numberOfPays = 0;
	  		}
	  	}//end of recurring
	  	//start of variable envs
	  	else {
	  		if(bill.autofillBoolean == "autofillVariableTrue") {
	  			var amountToDeposit = parseFloat(bill.autofillVarAmount);
	  			var dat = new Object();
	  			dat.amountToDeposit = amountToDeposit;
	  			dat.numberOfPays = numberOfPays;
	  			dat.variable = variable;
	  			fillData[billName] = dat;
		  		depositsNeeded = (parseFloat(amountToDeposit) + parseFloat(depositsNeeded)).toFixed(2);	
	  		}
	  		
	  	}
	  		
 	});
 	
 	var unaccounted = (parseFloat(document.getElementById("headerUnaccounted").innerHTML) + parseFloat(income)).toFixed(2);
 	
 	var test = (parseFloat(depositsNeeded) - parseFloat(unaccounted)).toFixed(2);
 	
 	if(test <= 0) { //is there enough to fill the envelopes?
 		var entries = Object.entries(fillData);//convert to iterable
 		for (var [billName, data] of entries) {
 			
  			addTrans(billName, "income", data.amountToDeposit, "autofill");
		}
		
 		showAutoFill(entries, "enough");
 		
 	}
 	else { //not enough to fill envelopes
 		var i;
 		var newDepositsNeeded = parseFloat(depositsNeeded);
 		var entries = Object.entries(fillData);
 		for (i = 0; i < entries.length; i++) {//remove variable
 			var billName = entries[i][0];
 			var data = entries[i][1];
 			
 			
 			if(data.variable == "variable"){
 				newDepositsNeeded = (parseFloat(newDepositsNeeded) - parseFloat(data.amountToDeposit)).toFixed(2);
 				
 				entries.splice(i, 1); 
 				i--;
 			}
 			
		}
		var test = (parseFloat(newDepositsNeeded) - parseFloat(unaccounted)).toFixed(2);
		if(test <= 0) {//can I fill them now?
			for (var [billName, data] of entries) {
	 			
	 			addTrans(billName, "income", data.amountToDeposit, "autofill");
			}
			showAutoFill(entries, "partial");
		}
		else {//fill envelopes due before next check, then percentage of remainder
			
			var dueNowDepositsNeeded = 0;
			var newUnaccounted = 0; //used to make percentage
			var x;
			for (x = 0; x < entries.length; x++) {
	 			var billName = entries[x][0];
	 			var data = entries[x][1];
	 			if(data.numberOfPays === 0){
	 				dueNowDepositsNeeded = (parseFloat(data.amountToDeposit) + parseFloat(dueNowDepositsNeeded)).toFixed(2);
	 				newUnaccounted = (parseFloat(newUnaccounted) + parseFloat(data.amountToDeposit)).toFixed(2);
	 				newDepositsNeeded = (parseFloat(newDepositsNeeded) - parseFloat(data.amountToDeposit)).toFixed(2);
	 			}
		 		
			}
			var test = (parseFloat(dueNowDepositsNeeded) - parseFloat(newUnaccounted)).toFixed(2);
			if(test <= 0) {
				newUnaccounted = (parseFloat(unaccounted) - parseFloat(newUnaccounted)).toFixed(2);
				var percentage = newUnaccounted / newDepositsNeeded;
				var y;
				for (y = 0; y < entries.length; y++) {
					console.log( billName +" "+ data.numberOfPays);
		 			var billName = entries[y][0];
		 			var data = entries[y][1];
					if(data.numberOfPays === 0){
	 					addTrans(billName, "income", data.amountToDeposit, "autofill");
	 				}
	 				else {
	 					data.amountToDeposit = (parseFloat(data.amountToDeposit) * parseFloat(percentage)).toFixed(2);
	 					console.log(data.amountToDeposit);
	 					addTrans(billName, "income", data.amountToDeposit, "autofill");
	 				}
	 				
				}
				showAutoFill(entries, "percentage");
			}
			
			else {
				showAutoFill(entries, "no");
			}
		}
 	}
}

function showAutoFill(dat, enough) {
	$("#addIncome").on({
		popupafterclose: function() {
			 $('#showAutoFillPopUp').popup();
			setTimeout(function() { 
			 	
				$("#showAutoFillPopUp").popup( "open" ) }, 100 );
		}
	});
	$("#addIncome").popup("close");
	$("#autoFillOkBut").click(function () {
		window.location = windowLocation;
	});
	if(enough === "enough") {
		document.getElementById("autofillShowHeader").innerHTML = "Yay! Envelopes filled.";
		for (var [billName, data] of dat) {
			var itm = "<li><h1>"+billName+"</h1><p class='ul-aside'>Filled with "+data.amountToDeposit+"</p></li>";
			$("#AutofillList").append(itm);
		}
	}
	else if(enough === "partial") {
		document.getElementById("autofillShowHeader").innerHTML = "Due to your income, only recurring bills have been filled for you.";
		for (var [billName, data] of dat) {
			var itm = "<li><h1>"+billName+"</h1><p class='ul-aside'>Filled with "+data.amountToDeposit+"</p></li>";
			$("#AutofillList").append(itm);
		}
	}
	else if(enough === "percentage") {
		document.getElementById("autofillShowHeader").innerHTML = "Due to lack of income, recurring envelopes due before your next check were filled first, followed by a percentage of the remaining recurring bills.";
		for (var [billName, data] of dat) {
			var itm = "<li><h1>"+billName+"</h1><p class='ul-aside'>Filled with "+data.amountToDeposit+"</p></li>";
			$("#AutofillList").append(itm);
		}
	}
	else if(enough === "no") {
		document.getElementById("autofillShowHeader").innerHTML = "Unable to fill envelopes due to lack of funds.";
	}
	
}


function deleteData() {
  //remove database to reset app

	var request = window.indexedDB.deleteDatabase(dataBase);

	alert("Data deleted. A fresh start is in order.");
	window.location = windowLocation;
	request.onerror = function (event) {
		console.log("data deletion error "+ event.target.error);
	};
	request.onsuccess = function (event) {
      		return null;
    	};
}


function getNextPays(firstPay, payFreq) {
	Date.prototype.addDays = function(days) {
    		var date = new Date(this.valueOf());
    		date.setDate(date.getDate() + days);
    		return date;
	};
	var paydays = [];
	if (payFreq === "weekly") {
		paydays.push(firstPay);
		paydays.push(firstPay.addDays(7));
		paydays.push(firstPay.addDays(14));
		paydays.push(firstPay.addDays(21));
		paydays.push(firstPay.addDays(28));
		return paydays;
	}
	else if (payFreq === "biweekly") {
		paydays.push(firstPay);
		paydays.push(firstPay.addDays(14));
		paydays.push(firstPay.addDays(28));
		return paydays;
	}
	else if (payFreq === "monthly") {
		paydays.push(firstPay);
		var nextone = new Date(firstPay);
		nextone.setMonth(nextone.getMonth()+1);
		paydays.push(nextone);
		return paydays;
	}
}

function getPayData() {
	return new Promise (function(resolve) {

	        var transaction = myData.transaction(["PayData"]); 
	        var objectStore = transaction.objectStore("PayData");
	        var request = objectStore.get(1);
	        request.onerror = function(event) {
			
	        	console.log("wtf " + event.target.errorCode);
	        	return null;
	        };
	        request.onsuccess = function(event) {
	
	        	return resolve(request.result);
	        };

    });
}

function resetNextPayDays() {
	getPayData().then(function (result) {
		var nextPay = result[1][1];
		var freq = result[2];
		var nextPays = getNextPays(nextPay, freq);
		var PayData = [result[0], nextPays, result[2]];
		insertPayData(PayData);
	});
}

function insertPayData(data) {
	var store = "PayData";
	var transaction = myData.transaction([store], "readwrite");
	var objectStore = transaction.objectStore(store, "readwrite");
	var request = objectStore.put(data, 1);
	request.onsuccess = function () {
		console.log('inserted pay data');
		return;
	};
	request.onerror = function (event) {
		console.log(event.target.errorCode);
	};
}

$("#procPaySubmitBut").click(function() {processPay("init")});
$("#editPayDataBut").click(function() {processPay("edit")});
function processPay(type) {
        if(type === "init") {
		var pay = $.trim(document.getElementById("payAmount").value);
		var nextPay = new Date(document.getElementById("payday").value);
		var payFreq = document.getElementById("payFreq").options[document.getElementById("payFreq").selectedIndex].value;
		if(pay === ""){
			alert('Please provide an expected pay');
			return;
		}
	
		//get next variable paydays (4 for weekly, 2 for bi, and one for month)
		var nextPays = getNextPays(nextPay, payFreq);
		var PayData = [pay, nextPays, payFreq];
		insertPayData(PayData);
	}
	else if(type === "edit") {
		var pay = $.trim(document.getElementById("edit-payAmount").value);
		var nextPay = new Date(document.getElementById("edit-payday").value);
		var payFreq = document.getElementById("edit-payFreq").options[document.getElementById("edit-payFreq").selectedIndex].value;
		if(pay === ""){
			alert('Please provide an expected pay');
			return;
		}
	
		//get next variable paydays (4 for weekly, 2 for bi, and one for month)
		var nextPays = getNextPays(nextPay, payFreq);
		var PayData = [pay, nextPays, payFreq];
		insertPayData(PayData);
		window.location = windowLocation;
	}
	

}

function getBill(billName) {
	return new Promise (function (resolve) {
		var bill = billName;
		var transaction = myData.transaction(["bills"], "readonly");
		var objectStore = transaction.objectStore("bills");
		var myIndex = objectStore.index('billName');
		myIndex.openCursor(bill).onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				return resolve(cursor.value);
			}
			else {
				alert("wtf when getting bill - contact Brawer Online with error.");
			}
		}
	});

}

function viewEnvelope(billName) {
	var bill = decodeURIComponent(billName);
	getBill(bill).then(function (result) {
		var cursor = result;
		$("#viewEnvelope").popup("open");
		document.getElementById("viewAmount").innerHTML = cursor.amount;
		document.getElementById("viewBal").innerHTML = cursor.bal;
		if(cursor.variable === "recurring") {
			$("#viewRecurHeaderName").show();
			$("#viewRecurHeaderDue").show();
			$("#viewEnvelopeVar").hide();
			document.getElementById("viewNameRecur").innerHTML = cursor.billName;
			document.getElementById("viewAmountLabel").innerHTML = "<b>Amount Due: </b>";
			document.getElementById("viewDue").innerHTML = cursor.dueDate;	
		}
		else {
			$("#viewRecurHeaderName").hide();
			$("#viewRecurHeaderDue").hide();
			$("#viewEnvelopeVar").show();
			if(cursor.autofillBoolean === "autofillVariableTrue") {
				document.getElementById("viewNameVar").innerHTML = cursor.billName + "<object align='right'><font color='green'>autofill</font></object>";
				}
			else {
				document.getElementById("viewNameVar").innerHTML = cursor.billName;
			}
			document.getElementById("viewAmountLabel").innerHTML = "<b>Goal: </b>";
		}
		
		$("#deleteBillButton").click(function () {
			$("#viewEnvelope").on({
				popupafterclose: function() {
				setTimeout(function() { $("#deleteBillConfirm").popup( "open" ) }, 100 );
				}
			});
			$("#viewEnvelope").popup("close");
			$("#deleteBillConfirm").on({
					popupafterclose: function () {window.location.reload(false);}
				});
			document.getElementById("deleteBillConfirmName").innerHTML = bill;
			$("#deleteBillConfirmConfirmed").click(function () {
				deleteBill(document.getElementById("deleteBillConfirmName").innerHTML);
				
			});
			
	
		});
		$("#editBillButton").click(function () {
		    $(':mobile-pagecontainer').pagecontainer('change', '#editBudgetEnvelope');
		    document.getElementById("edit-origBillName").value = bill;
		    document.getElementById("edit-billName").value = bill;
	
		    document.getElementById("edit-billAmount").value = cursor.amount;
		    document.getElementById("edit-bal").value = cursor.bal;
		    document.getElementById("edit-autofillVariableAmount").value = cursor.autofillVarAmount;
	
		    var dueDate = $("#edit-dueDate");
	            dueDate.val(cursor.dueDate).attr('selected', true).siblings('option').removeAttr('selected');
	
	            dueDate.selectmenu("refresh", true);
	
	            var vari = $("#edit-variableOrRecur");
	            vari.val(cursor.variable).flipswitch("refresh");
	            var auto = $("#edit-autofillVariableOpt");
	            auto.val(cursor.autofillBoolean).flipswitch("refresh");
	            
		    });
	
		$( '#viewEnvelope' ).popup( 'reposition', 'position-to: window' );
	});

	
}

function daysUntil(firstDate, secondDate) {
	if(secondDate === undefined) {
		secondDate = new Date();
	}
	var timeDiff = firstDate.getTime() - secondDate.getTime();
	var days = Math.ceil(timeDiff / (1000 * 3600 * 24));
	return days;
}

function showMonthlyPay() {
	getPayData().then(function (result) {
		var payData = result;
		var freq = payData[2];//frequency
		var nextPay = payData[1][0];//next pay from next pays array
		var daystilPay = daysUntil(nextPay); //update days until pay in header
		if(daystilPay < 0) {
			$("#helperPopUp").popup("open");
			document.getElementById("helperHeader").innerHTML = "PayDay Helper";
			document.getElementById("helperText").innerHTML = "You were paid " + Math.abs(daystilPay) + " days ago. Please add paycheck information.";
			$("#helperPopUp").on({
	        				popupafterclose: function() {
	            				setTimeout(function() { $("#addIncome").popup( "open" ) }, 100 );
	        				}
	    				});
			
			$("#helperOkBut").click(function() {
				$('#helperPopUp').popup("close");
			});
		}
		document.getElementById("headerDaysTilPay").innerHTML = daystilPay;
		Date.prototype.addDays = function(days) {
	    		var date = new Date(this.valueOf());
	    		date.setDate(date.getDate() + days);
	    		return date;
		};
		Date.prototype.subDays = function(days) {
	    		var date = new Date(this.valueOf());
	    		date.setDate(date.getDate() - days);
	    		return date;
		};
		
		function getMonthly(daysToCheck) {
			var payDay = nextPay.getDay();
			var counter = 1;
			var month = nextPay.getMonth();
			var next = nextPay;
			while(true) {
				next = next.addDays(daysToCheck);
				if(next.getMonth() == month) {
					counter += 1;
				}
				else {
					break;
				}
			}
			var next = nextPay;
			while(true) {
				next = next.subDays(daysToCheck);
				if(next.getMonth() == month) {
					counter += 1;
				}
				else {
					break;
				}
			}
	    		var monthlyIncome = counter * payData[0];//pay amount
	    		
	    		document.getElementById("baseMonthlyIncome").innerHTML = monthlyIncome;
	    		footer(counter);
		}
		if(freq === "weekly"){
			getMonthly(7);
		}
		else if(freq === "biweekly"){
			getMonthly(14);	
		}
		else {
			document.getElementById("baseMonthlyIncome").innerHTML = payData[0];
			footer(1);
		}
		
	});
	function footer(counter) {
		var counter = counter;
	getBills().then(function (result) {
		
		var bills = result;
		var monthlyBills = 0;
		var envBalances = 0;
		bills.forEach(function (bill) {
			if(bill.variable === "recurring") {
				monthlyBills = (parseFloat(monthlyBills) + parseFloat(bill.amount)).toFixed(2);
			}
			else {//variable
				if(bill.autofillBoolean === "autofillVariableTrue") {
					var monthlyTotal = parseFloat(bill.autofillVarAmount) * parseFloat(counter);
					monthlyBills = (parseFloat(monthlyBills) + parseFloat(monthlyTotal)).toFixed(2);
				}
			}
			if(bill.bal > 0) {
				envBalances = (parseFloat(envBalances) + parseFloat(bill.bal)).toFixed(2);
			}
			else{
				envBalances = (parseFloat(envBalances) - parseFloat(bill.bal)).toFixed(2);
			}
		});
		
		getBankInfo().then(function (bankIn) {
		if(bankIn === undefined) {
		//do nothing
		}
		else {
			var bankInfo = bankIn;
			var unnacc = (parseFloat(bankInfo.bankBal) - parseFloat(envBalances)).toFixed(2);
			if(unnacc < 0) {
				$("#headerUnaccounted").attr('color', "red");
				$("#unaccountedNotify").show();
			}
			else if(unnacc == 0){
				$("#headerUnaccounted").attr('color', "green");
				$("#unaccountedNotify").hide();
			}
			else {
				$("#headerUnaccounted").attr('color', "#ebb134");
				$("#unaccountedNotify").hide();
			}
			var bb = parseFloat(bankInfo.bankBal).toFixed(2);
			if(bb < 0) {
				$("#headerBankBal").attr('color', "red");
			}
			document.getElementById("headerBankBal").innerHTML = bankInfo.bankBal;
			document.getElementById("headerUnaccounted").innerHTML = unnacc;
			
		}
	});
		document.getElementById("totalMonthlyBills").innerHTML = monthlyBills.toString();
		
	});
	}
	
}

function addTrans(billName, typeOfTrans, amount, transFor) {
	
	return new Promise (function (resolve) {
		var envelope = billName;
		var today = new Date();
		var date = (today.getMonth()+1)+'-'+today.getDate()+'-'+today.getFullYear();
		var time = today.getHours() + ":" + today.getMinutes();
		var dateTime = date+' '+time;
		var transData = {envelope, typeOfTrans, amount, transFor, dateTime};
		
		getBankInfo().then(function (bankIn) {
			var bankInfo = bankIn;
			if(bankIn === undefined) {
				$("#helperPopUp").popup("open");
				document.getElementById("helperHeader").innerHTML = "Helper";
				document.getElementById("helperText").innerHTML = "Please add your current bank balance first.";
				$("#helperPopUp").on({
		        				popupafterclose: function() {
		            				setTimeout(function() { $("#adjustBankBal").popup( "open" ) }, 100 );
		        				}
		    				});
				
				$("#helperOkBut").click(function() {
					$('#helperPopUp').popup("close");
				});
				$("#addTrans").on({
	        				popupafterclose: function() {
	            				setTimeout(function() { $("#helperPopUp").popup( "open" ); }, 100 );
	        				}
	    				});
				$('#addTrans').popup("close");
				return resolve("false");//report failure
			}
			else {
				
				if(billName === "bank") {
					var bankBal =  parseFloat(transData.amount).toFixed(2);
					transData.bankBal = bankBal;
					addToDB(transData, "transactions");
					return resolve("true");
				}
				else if(billName === "unaccounted"){
					transData.bankBal = bankInfo.bankBal;
					if(typeOfTrans === "expense") {
						var bankBal = (parseFloat(bankInfo.bankBal) - parseFloat(transData.amount)).toFixed(2);
						bankInfo.bankBal = (parseFloat(bankInfo.bankBal) - parseFloat(amount)).toFixed(2);
						transData.bankBal = bankBal;
						addToDB(bankInfo, "bank", 1);
					}
					addToDB(transData, "transactions");
					return resolve("true"); //report success
				}
				else {
					getBill(envelope).then(function (result) {
						var bill = result;
						
						if(typeOfTrans === "income") {
							bill.bal = (parseFloat(bill.bal) + parseFloat(amount)).toFixed(2);
							updateBill(envelope, bill);
							transData.bankBal = bankInfo.bankBal;
							addToDB(transData, "transactions");
							return resolve("true");
						}
						else if(typeOfTrans === "transfer") {
							//alert("Transfered "+ amount+ " from " + bill.billName +".");
							bill.bal = (parseFloat(bill.bal) - parseFloat(amount)).toFixed(2);
							if(bill.bal < 0) {
								alert("Cannot transfer " + amount + ", as this would put " +bill.billName + " negative.");
								return false;
							}
							updateBill(envelope, bill);
							transData.bankBal = bankInfo.bankBal;
							addToDB(transData, "transactions");
							return resolve("true");
						}
						else if(typeOfTrans === "expense") {
							bankInfo.bankBal = (parseFloat(bankInfo.bankBal) - parseFloat(amount)).toFixed(2);
							bill.bal = (parseFloat(bill.bal) - parseFloat(amount)).toFixed(2);
							if(bill.bal < 0 && bankInfo.bankBal > 0){
								var otherTransAmount = Math.abs(parseFloat(bill.bal)).toFixed(2);
								bankInfo.bankBal = (parseFloat(bankInfo.bankBal) + parseFloat(otherTransAmount)).toFixed(2);
								bill.bal = "0.00";
								addToDB(bankInfo, "bank", 1); 
								updateBill(envelope, bill);
								transData.bankBal = bankInfo.bankBal;
								transData.amount = (parseFloat(transData.amount) - parseFloat(otherTransAmount)).toFixed(2);
								addToDB(transData, "transactions");
								
								$("#addTrans").popup("close");
								document.getElementById("helperHeader").innerHTML = "Helper";
								document.getElementById("helperText").innerHTML = "You over spent in "+bill.billName+" by "+otherTransAmount+". Please choose an envelope to pull this from.";
								$("#otherTransSelect").show();
								var otherEnvSelect = $("#addTransHelperSelect");
								var bills = myGlobalBills;
								var unac = (parseFloat(document.getElementById("headerUnaccounted").innerHTML)).toFixed(2);
								if(parseFloat(unac) >= parseFloat(otherTransAmount)) {
									var optTempl2 = '<option value="unaccounted">Unaccounted</option>';            
							            	otherEnvSelect.append(optTempl2);
							            	otherEnvSelect.selectmenu("refresh", true);
								}
								bills.forEach(function(bill2) { 
									if(parseFloat(bill2.bal) >= parseFloat(otherTransAmount) && bill2.billName != bill.billName) {    
							            		var optTempl = '<option value="' +bill2.billName+ '">'+bill2.billName+'        $'+parseFloat(bill2.bal)+'</option>';            
							            		otherEnvSelect.append(optTempl);
							            		otherEnvSelect.selectmenu("refresh", true);
					            			}
				            			});
					            		
								$("#addTrans").on({
						        				popupafterclose: function() {
						            				setTimeout(function() { $("#helperPopUp").popup( "open" ); }, 100 );
						        				}
						    				});
								
								$("#helperOkBut").click(function() {
									var billSelected = document.getElementById("addTransHelperSelect");
									var expenseEnv = billSelected.options[billSelected.selectedIndex].value;
									var expenseFor = "Overspend in " + billName;
									addTrans(expenseEnv, "expense", otherTransAmount, expenseFor).then(function (resolve) {
										var transSuccess = resolve;
										if(transSuccess === "true") {
											$("#otherTransSelect").hide();
											window.location = windowLocation;
										}
									});
								});
								
							}
							else if(bill.bal < 0 && bankInfo.bankBal < 0) {
								bill.bal = "0.00";
								addToDB(bankInfo, "bank", 1);
								updateBill(envelope, bill);
								transData.bankBal = bankInfo.bankBal;
								addToDB(transData, "transactions");
								return resolve("true");
							}
							else {
								addToDB(bankInfo, "bank", 1);
								updateBill(envelope, bill);
								transData.bankBal = bankInfo.bankBal;
								addToDB(transData, "transactions");
								return resolve("true");
							}
						}
					});
				}
			}
		});
	
	});
	
}

function addTransInit(billName) {
	$( '#addTrans' ).popup( 'reposition', 'positionTo: window' );
	var billName = decodeURIComponent(billName);
	document.getElementById("transAmount").value = "";
	$("#incomeDiv").hide();
	$("#transForDiv").show();
	var billSelect = $("#addTransEnvSelect");
	var pullFrom = $("#addTransEnvSelectPullFrom");
	var typeIncome = false;
	billSelect.selectmenu();
	pullFrom.selectmenu();
	
	var bills = myGlobalBills;
	if($("#addTransEnvSelect option").length != bills.length){
		var unaccounted = parseFloat(document.getElementById("headerUnaccounted").innerHTML).toFixed(2);
		if(unaccounted > 0) {
			pullFrom.append("<option value='unaccounted'>Unaccounted</option>");
		}
		bills.forEach(function(bill) {              
            		var optTempl = '<option value="' +bill.billName+ '">'+bill.billName+'        $'+parseFloat(bill.bal)+'</option>';            
            		billSelect.append(optTempl);
    			billSelect.selectmenu("refresh", true);
    			if(bill.bal > 0 && bill.billName != billName) {
            			pullFrom.append(optTempl);
            			pullFrom.selectmenu("refresh", true);
            		}
	            		
    		});
    	}
    	
    	
    	pullFrom.val("unaccounted").attr('selected', true).siblings('option').removeAttr('selected');
    	pullFrom.selectmenu("refresh", true);
    	
    	billSelect.val(billName).attr('selected', true).siblings('option').removeAttr('selected');
	billSelect.selectmenu("refresh", true);
	$("#addTransEnvSelect").on("change", function() {
		var billSelected = document.getElementById("addTransEnvSelect");
		var expenseEnv = billSelected.options[billSelected.selectedIndex].value;
		if(expenseEnv === "unaccounted") {
			pullFrom.append('<option value="' +billName+ '">'+billName+'</option>');
			pullFrom.selectmenu("refresh");
			pullFrom.val(billName).attr('selected', true).siblings('option').removeAttr('selected');
    			pullFrom.selectmenu("refresh", true);
		}
		else {
			$("#addTransEnvSelectPullFrom option[value='"+billName+"']").remove();
			pullFrom.val("unaccounted").attr('selected', true).siblings('option').removeAttr('selected');
    			pullFrom.selectmenu("refresh", true);
		}
	});
	$("input[name='radio-choice-trans']").on("change", function() {
		if ($("input[name='radio-choice-trans']:checked").val() === 'transfer'){
			billSelect.append("<option value='unaccounted'>Remove Budgeted Amount</option>");
			$("#incomeDiv").show();
			$("#transForDiv").hide();
			document.getElementById("addTransEnvLabel").innerHTML = "Transfer to: ";
			typeIncome = true;
		}
		else{
			$("#addTransEnvSelect option[value='unaccounted']").remove();
			billSelect.val(billName).attr('selected', true).siblings('option').removeAttr('selected');
			billSelect.selectmenu("refresh", true);
			$("#incomeDiv").hide();
			$("#transForDiv").show();
			document.getElementById("addTransEnvLabel").innerHTML = "Add to: ";
			typeIncome = false;
		}
	});
	$("#transAmount").on("change", function() {
		if(document.getElementById("transAmount").value !== "") {
			$("#submitTransDiv").show();
		}
		else {
			$("#submitTransDiv").hide();
		}
	});
	$("#submitTransBut").click(function() {
		var billSelected = document.getElementById("addTransEnvSelect");
		var expenseEnv = billSelected.options[billSelected.selectedIndex].value;
		var expenseAmount = parseFloat(document.getElementById("transAmount").value, 10).toFixed(2);
		var expenseFor = document.getElementById("transFor").value;
		if(typeIncome) {
			var pullFromSelected = document.getElementById("addTransEnvSelectPullFrom");
			var pullFromEnv = pullFromSelected.options[pullFromSelected.selectedIndex].value;
			addTrans(pullFromEnv, "transfer", expenseAmount, "Transfer to " + expenseEnv).then(function (result) {
				var transSuccess1 = result;
				if(transSuccess1 === "true") {
				
					addTrans(expenseEnv, "income", expenseAmount, "Transfer from " + pullFromEnv).then(function (resolve) {
						var transSuccess2 = resolve;
						if(transSuccess2 === "true") {
							window.location = windowLocation;
						}
					});
				}
			});
			
		}
		else {
			
			addTrans(expenseEnv, "expense", expenseAmount, expenseFor).then(function (resolve) {
				var transSuccess = resolve;
				if(transSuccess === "true") {
					window.location = windowLocation;
				}
			});
		}
	});
	
	


}

function addIncome(income){
	if(income === ""){
		alert("Income cannot be blank");
	}
	else {
		var income = income;
		var bankBal = 0;
		
		getBankInfo().then(function (bankIn) {
			var bankInfo = bankIn;
			if(bankInfo === undefined) {
				bankBal = (parseFloat(bankBal) + parseFloat(income)).toFixed(2)
				
			}
			else {
				bankBal = (parseFloat(bankInfo.bankBal) + parseFloat(income)).toFixed(2);
				
			}
			
			var bank = {bankBal};
			addTrans("bank", "income", income, "income");
			addToDB(bank, "bank", 1);
			
			if ($("input[name='radio-choice-addIncome']:checked").val() === 'paycheck'){
				resetNextPayDays();
				autoFillEnvelopes(income);
			}
			else {
				window.location = windowLocation;
			}
			
			
			
		});
	}
};

function getBankInfo(){
	return new Promise (function(resolve) {


	        var transaction = myData.transaction(["bank"]); 
	        var objectStore = transaction.objectStore("bank");
	        var request = objectStore.get(1);
	        request.onerror = function(event) {
	
	          	console.log("wtf " + event.target.errorCode);
	        };
	        request.onsuccess = function(event) {
			
	          	return resolve(event.target.result);
	        };

    });

};

$("#addIncome").on({
	popupafteropen: function() {
		getPayData().then(function(payData) {
			$("#addIncomeAmount").attr("placeholder", payData[0]);
			$("#addIncomeAmount").focus();
			$("#submitAddIncome").click(function() {
				
				addIncome(document.getElementById("addIncomeAmount").value);
			});
		});
	}
	
});

$("#adjustBankBal").on({
	popupafteropen: function() {
		getBankInfo().then(function (bankIn) {
			var bankInfo = bankIn;
			if(bankInfo === undefined) {
				$("#adjustBankAmount").attr("placeholder", 0);
				bankInfo = {"bankBal": 0};
			}
			else {
				$("#adjustBankAmount").attr("placeholder", bankInfo.bankBal);
			}
			
			var bankBal = bankInfo.bankBal;
			var unaccounted = bankInfo.unaccounted;
			$("#adjustBankBalSubmitBut").click(function () {
				var submittedAmount = parseFloat(document.getElementById("adjustBankAmount").value).toFixed(2);
				if(isNaN(submittedAmount))  {
					alert("Please add an amount");
					return;
				}
				var difference =  (parseFloat(submittedAmount) - parseFloat(bankBal)).toFixed(2);
				bankBal = (parseFloat(difference) + parseFloat(bankBal)).toFixed(2);
				var bank = {bankBal};
				addToDB(bank, "bank", 1);
				addTrans("bank", "adjust", bankBal, "Adjust Bank");
				
				window.location = windowLocation;
			});
		});
	}
});

$("#viewTransBut").click(function () {
	viewTransInit();
});

function initialBankBalSubmitted () {

	var submittedAmount = parseFloat(document.getElementById("initialBankAmount").value).toFixed(2);
	if(isNaN(submittedAmount))  {
		alert("Please add an amount");
		return;
	}
	var bank = {"bankBal": submittedAmount};
	addToDB(bank, "bank", 1);
	addTrans("bank", "adjust", submittedAmount, "Adjust Bank");
	
	$(':mobile-pagecontainer').pagecontainer('change', '#addBudgetEnvelope');
	

}



function getTrans() {
    return new Promise (function(resolve) {


        var transaction = myData.transaction(["transactions"]); 
        var objectStore = transaction.objectStore("transactions");
        var request = objectStore.getAll();
        request.onerror = function(event) {

          console.log("wtf " + event.target.errorCode);
        };
        request.onsuccess = function(event) {

          return resolve(event.target.result);
        };

    });
}



function viewTransInit() {
        $("#viewTransList").empty();
        getTrans().then(function (result) {
        	var trans = result[0];
        	var i;
        	for(i = trans.length -1; i > -1; i--) {
        		var tran = trans[i];
        		var amount;
        		if(tran.typeOfTrans === "income"){
        			amount = "<font color='green'>+"+tran.amount+"</font>";
        		}
        		else if(tran.typeOfTrans === "adjust"){
        			amount = "<font color='orange'>"+tran.amount+"</font>";
        		}
        		else {
        			amount = "<font color='red'>-"+tran.amount+"</font>";
        		}
        		$("#viewTransList").append($("<li><h1>" + amount + "</h1><p><strong>Envelope:</strong> "+tran.envelope+"</p><p>"+tran.transFor+
        		"</p><p class='ui-li-aside'><strong>"+tran.dateTime+"</br>Bank:</strong> "+tran.bankBal+"</p></li>"));
        	}
        });
}
$(document).on( "pagecontainershow", function( event, ui ) {
    	var pageId = $('body').pagecontainer('getActivePage').prop('id'); 

    	if (pageId === 'editPayData') {
		var pay = myGlobalPayData[0];
		var nextPay = myGlobalPayData[1][0];
		var payFreq = myGlobalPayData[2];
		
		document.getElementById("edit-payAmount").value = pay;
		$('#edit-payday').datepicker();
		$('#edit-payday').datepicker('setDate', nextPay);
		var payfreqSel = $("#edit-payFreq");
	        payfreqSel.val(payFreq).attr('selected', true).siblings('option').removeAttr('selected');
	        payfreqSel.selectmenu('refresh');
	}
});

$(document).on( "pagecontainershow", function( event, ui ) {
    	var pageId = $('body').pagecontainer('getActivePage').prop('id'); 

    	if (pageId === 'about') {
		if(myGlobalPayData === undefined) {//hide button in about page
			$("#startBudgetBut").show();
		}
		else {
			$("#startBudgetBut").hide();
		}
	}
});

$("#addTransClose").click(function () {
        window.location = windowLocation;
	
});
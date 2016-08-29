var hasSeenNewest = true,
	animating = false,
	state, socket = io(),
	currentid = $("#editor [name=parent]").val();

$("time").timeago();
$(".focus").focus();

socket.join(currentid);
socket.on("removal", function() {
	flash("This story has been removed.");
});
socket.on("edited", function(msg) {
	flash(msg);
});
socket.on("haschildren", function(msg) {
	flash(msg);
});

$("#user").click(function(e) {
	var show = !$(this).hasClass("dropped");
	if (show) $("#userdropdown").show().outerWidth();
	else setTimeout(function() {
		$("#userdropdown").hide();
	}, 300);
	$("#user, #userdropdown").toggleClass("dropped", show);
	e.preventDefault();
});

$(document).click(function(e) {
	if ($("#user").hasClass("dropped") && !$(e.target).is("#user") && !$(e.target).is("#userdropdown *")) $("#user").click();
}).keypress(function(e) {
	if (!$(e.target).is("input, textarea")) {
		if (e.which == 110 || e.which == 117) { // n or u
			$("#navigation .continue").click();
		} else if (e.which == 119 || e.which == 111) { // w or o
			$("#navigation .write").click();
		} else if (e.which == 106) { // j
			$("#navigation .jump").click();
		} else if (e.which == 115 || e.which == 105) { // s or i
			$("#actions .star").click();
		} else if (e.which == 102) { // f
			$("#actions .flag").click();
		} else if (e.which == 100) { // d
			$(".darktoggle").click();
		} else {
			return true;
		}
		return false;
	}
}).keyup(function(e) {
	if (!$(e.target).is("input, textarea")) {
		if (e.which == 80) { // p
			$("#navigation .jump").click();
			return false;
		}
	}
});

$(".darktoggle").click(function(e) {
	$("html").addClass("noanimate").outerWidth();
	$("html").toggleClass("darkmode").outerWidth();
	$("html").removeClass("noanimate");
	e.preventDefault();
});

$("#actions > a").replaceWith(function() {
	return $("<button />")
		.attr("class", $(this).attr("class"))
		.attr("title", $(this).attr("title"))
		.append($(this).contents());
});

$("footer #userdropdown").appendTo("header > div");

$("#actions .continue").click(function(e) {
	if (!animating) {
		$.get("/next", {
			parent: currentid
		}).done(function(res) {
			if (res.status == "success") {
				if (hasSeenNewest) {
					cleanupStory();
					addNew(res.data.content, res.data);
					hasSeenNewest = false;
					$(window).scroll();
				} else {
					$("html, body").stop().animate({
						scrollTop: $("#story .part").last().offset().top - 60
					}, 300, "swing");
				}
			} else {
				flash(res.message);
			}
		}, "json");
	}
	e.preventDefault();
});

$(window).scroll(function() {
	var win = $(window);
	if (!hasSeenNewest && win.scrollTop() + win.height() > $("#editor").offset().top + 60) hasSeenNewest = true;
}).on("popstate", function(e) {
	if (e.originalEvent.state) stateChange(e.originalEvent.state);
	else stateChange({
		id: 0,
		changedat: "oh no",
		views: 9999999
	});
});

function stateChange(state) {
	$(".part").removeClass("pseudo-last").show();
	$("#part-" + state.id).nextAll(".part").hide();
	$(".part:visible").last().addClass("pseudo-last");
	syncState(state);
}

function syncState(state) {
	socket.leave(currentid);
	$("#editor [name=parent]").val(state.id);
	currentid = state.id;
	socket.join(currentid);
	$("#currentinfo time").attr("datetime", (new Date(state.changedat)).toISOString());
	$("#currentinfo .views span").text(state.views);
	$("#currentinfo .stars span").text(state.stars);
	star(state.starred, true);
}

function addNew(nextText, data) {
	$("#spacer").removeClass("animate").outerWidth();
	var piece = makePart(data),
		contentHeight = measureHeight(piece),
		spacerHeight = $("#spacer").height();
	$("#spacer").height(0).outerWidth();
	$("#spacer").addClass("animate").height(contentHeight);
	$("#currentinfo").addClass("fade");
	$("#editor [name=parent]").val(data.shortID);
	state = {
		id: data.shortID,
		changedat: data.changedat,
		views: data.views,
		stars: data.starcount,
		starred: data.starred
	};
	history.pushState(state, "", "/story/" + data.shortID);
	animating = true;
	setTimeout(function() {
		$("#spacer").removeClass("animate").height(0).outerWidth();
		$("#story").append(piece);
		$("#story .part .rewind.jsadd").unbind("click").click(function(e) {
			var parts = $(this).attr("href").split("/"),
				id = parts[parts.length - 1];
			window.history.go(-$("#part-" + id).nextAll(".part:visible").length);
			stateChange(JSON.parse($(this).attr("data-state")));
			e.preventDefault();
		});
		syncState(state);
		$("#story .part").outerWidth();
		$("#story .part").removeClass("hidden").find("a.rewind").attr("data-state", JSON.stringify(state));
		$("#currentinfo").removeClass("fade");
		animating = false;
	}, 350);
}

function makePart(data) {
	return $("<div>").attr("id", "part-" + data.shortID).addClass("hidden part").append(
		$("<div>").addClass("content").text(data.content)
	).append(
		$("<div>").addClass("info").html('by <a href="/user/' + data.author + '">' + data.author + '</a> ').append(
			$("<div>").addClass("right").html(
				/*'<a href="#" class="star">star</a> '+
				'<a href="#" class="comment">comment</a> '+
				'<a href="#" class="flag">flag</a> '+*/
				'<a href="/story/' + data.shortID + '" class="rewind jsadd">rewind</a>'
			)
		)
	);
}

function cleanupStory() {
	$("#part-" + currentid).nextAll(".part").remove();
	$(".part").removeClass("pseudo-last").show();
}

$("#actions .jump").click(function(e) {
	if (!animating) {
		$.get("/jump", {
			parent: currentid
		}).done(function(res) {
			if (res.status == "success") {
				var piece = makePart(res.data).removeClass("hidden").addClass("exitright"),
					contentHeight = measureHeight(piece),
					spacerHeight = $("#spacer").height(),
					targetWidth = $("#spacer").height($("#story .part").last().outerHeight()).outerWidth();
				var currHeight = $("#story .part").last().width(targetWidth).addClass("exitleft").outerHeight();
				cleanupStory();
				$("#spacer").addClass("animate").outerWidth();
				$("#spacer").height(contentHeight).css("margin-top", -currHeight + "px");
				$("#currentinfo").addClass("fade");
				animating = true;
				$("#editor [name=parent]").val(res.data.shortID);
				state = {
					id: res.data.shortID,
					changedat: res.data.changedat,
					views: res.data.views,
					stars: res.data.starcount,
					starred: res.data.starred
				};
				history.pushState(state, "", "/story/" + res.data.shortID);
				setTimeout(function() {
					syncState(state);
					$("#story .part").last().replaceWith(piece).removeClass("exitleft");
					$("#spacer").removeClass("animate").outerWidth();
					$("#spacer").height(0).css("margin-top", "");
					$("#story .part").outerWidth();
					$("#story .part").removeClass("exitright");
					$("#currentinfo").removeClass("fade");
					animating = false;
				}, 350);
			} else {
				flash(res.message);
			}
		}, "json");
	}
	e.preventDefault();
});

function flash(message, success) {
	$(".alert").remove();
	$("main").prepend($("<div>").addClass(success ? "alert success" : "alert error").text(message));
}

$("#actions .star").click(function() {
	$.get($(this).hasClass("starred") ? "/unstar" : "/star", {
		id: currentid
	}).done(function(res) {
		if (res.status == "success") {
			star(res.data.starred);
		}
	}, "json");
});

function star(starred, cancelanimation) {
	if (cancelanimation) $("#actions .star").addClass("noanimate").outerWidth();
	$("#actions .star").toggleClass("starred", starred)
		.find("i").removeClass("fa-star-o fa-star")
		.addClass(starred ? "fa-star" : "fa-star-o")
		.attr("title", starred ? "Unstar" : "Star");
	$("#actions .star").outerWidth();
	$("#actions .star").removeClass("noanimate");
	if (state) {
		state.starred = starred;
		history.replaceState(state, "", "/story/" + state.id);
	}
}

function measureHeight(content) {
	var h = $("#tester").height("auto").html(content).outerHeight();
	$("#tester").html("").height(0).outerHeight();
	return h;
}

$("#navigation .write").click(function() {
	$("#editor textarea").focus().select();
});

$("#editor").submit(function() {
	$.post("/create", $("#editor").serialize()).done(function(res) {
		if (res.status == "success") {
			addNew(res.data.content, res.data);
			$("#editor textarea").val("");
		}
	}, "json");
	return false;
});

$("#editor textarea").on("keyup keydown change", function(e) {
	if (e.which == 27) $(this).blur();
	$("#editor").toggleClass("hastext", $(this).val().length > 0);
});

$(".blocky input").on("keyup keydown change", function() {
	$(this).toggleClass("hastext", $(this).val().length > 0);
	$(this).prev("label").toggleClass("hastext", $(this).val().length > 0);
});

function modal(el, action) {
	if (action == "toggle") action = el.hasClass("modal") ? "close" : "open";
	if (action == "close") {
		el.addClass("hidden out");
		$("#cover").addClass("hidden");
		setTimeout(function() {
			el.removeClass("hidden modal out").hide();
			$("#cover").remove();
			$("html, body").css("overflow", "");
		}, 300);
	} else { // open
		el.addClass("hidden modal").show().outerWidth();
		$("body").append('<div id="cover" class="hidden">');
		el.removeClass("hidden").focus();
		$("#cover").click(function() {
			modal(el, "close");
		}).show().outerWidth();
		$("#cover").removeClass("hidden");
		$("body").css("overflow", "hidden");
		$("html").css("overflow-y", "scroll");
	}
}

SOURCE_EAT_AND_MEET= "source/eat-and-meet.html"
SOURCE_NASE_HOSPODA = "source/nase-hospoda.html"
SOURCE_RESTAURACIA_DRAG = "source/restauracia-drag.html"

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function loadEatAndMeetHtmlJquery() {
  return $.ajax({ url: SOURCE_EAT_AND_MEET, dataType: "text" });
}


function parseEatAndMeetJquery(doc) {
  const days = [];

  $(doc).find(".tab-pane").each((dayIndex, dayElement) => {
    const $day = $(dayElement);
    const meals = [];

    $day.find(".menu-body").each((index, element) => {
      const $meal = $(element);

      meals.push({
        title: cleanText($meal.find(".menu-title h4").text()),
        price: cleanText($meal.find(".menu-title .price").text()),
        description: cleanText($meal.find(".menu-description .desc").text()),
        allergens: cleanText($meal.find(".menu-description .desc span").text())
      });
    });

    days.push({
      day: $day.attr("id"),
      meals: meals
    });
  });

  return days;
}

function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

async function main() {
  const html = await loadEatAndMeetHtmlJquery(SOURCE_EAT_AND_MEET);
  const doc = parseHtml(html);
  const meals = parseEatAndMeetJquery(doc);

  console.log(meals);
}

main();
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

function parseEatAndMeetCommonMealsJQuery(doc) {
  const commonMeals = [];

  $(doc).find("section.weak-menu.our-menu")
  .find(".menu-body").each(function () {
      const $meal = $(this);
      const title = cleanText($meal.find("h5").text());
      const match = title.match(/\(([\d,\s]+)\)\s*$/);

      commonMeals.push({
        title: cleanText(title.replace(/\s*\([\d,\s]+\)\s*$/, "")),
        price: cleanText($meal.find(".price").text()),
        description: cleanText($meal.find(".desc").text()),
        allergens: match ? match[1].replace(/\s/g, "") : "",
        image: $meal.find("img").attr("src") || ""
      });
    });

  return commonMeals;
}


function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

async function main() {
  const html = await loadEatAndMeetHtmlJquery(SOURCE_EAT_AND_MEET);
  const doc = parseHtml(html);
  const meals = parseEatAndMeetJquery(doc);
  const commonMeals = parseEatAndMeetCommonMealsJQuery(doc);

  console.log(meals);
  console.log(commonMeals);
}

main();
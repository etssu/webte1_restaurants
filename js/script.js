SOURCE_EAT_AND_MEET= "source/eat-and-meet.html"
SOURCE_NASE_HOSPODA = "source/nase-hospoda.html"
SOURCE_RESTAURACIA_DRAG = "source/restauracia-drag.html"

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function loadEatAndMeetHtmlJquery() {
  return $.ajax({ url: SOURCE_EAT_AND_MEET, dataType: "text" });
}

function loadNaseHospodaHtmlJquery() {
  return $.ajax({url: SOURCE_NASE_HOSPODA, dataType: "text"});
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

function parseNaseHospodaJQuery(doc) {
  const days = [];

  $(doc).find("article").each((dayIndex, dayElement) => {
    const $day = $(dayElement);
    const meals = [];

    const dayName = cleanText($day.find("div.tracking-wider").text());
    const date = cleanText($day.find("div.text-white").first().text());

    if (!dayName || !date){
      return;
    }

    $day.find(".flex.gap-4.py-4").each((index, element) => {
      const $meal = $(element);

      const $title = $meal.find(".min-w-0 .font-bold.text-hospoda-cream");
      const weight = cleanText($title.find("span").text());
      const title = cleanText(
        $title.clone().children("span").remove().end().text()
      );
      const $type = $meal.find(".mt-1.flex.flex-wrap");
      const type = cleanText($type.find("span").eq(0).text());
      const allergens = cleanText($type.find("span").eq(1).text());

      meals.push({
        title: title,
        weight: weight,
        type: type,
        allergens: allergens,
        price: cleanText($meal.find(".shrink-0.text-hospoda-cream").text())
      });

    });
    days.push({
        day: dayName,
        date: date,
        meals: meals
      });
    
  });

  return days;
}

function parseNaseHospodaSpecialJQuery(doc) {
  const special = {
    title: "Týždenný špeciál",
    meals: []
  }

  const $article = $(doc).find("article").filter(function () {
    return cleanText($(this).find("h3").first().text()) === "Týždenný špeciál";
  }).first();

  $article.find(".flex.gap-4.py-4").each(function () {
    const $meal = $(this);
    const $title = $meal.find(".min-w-0 .font-bold.text-hospoda-cream");

    const weight = cleanText($title.find("span").first().text());

    const title = cleanText(
      $title.clone().children("span").remove().end().text()
    );

    const allergens = cleanText(
      $meal.find(".mt-1.text-xs.text-zinc-400").text()
    );

    const price = cleanText(
      $meal.find(".shrink-0.font-bold.text-hospoda-cream").text()
    );

    special.meals.push({
      title,
      weight,
      allergens,
      price
    });
  });

  return special;
}


function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

async function main() {
  const htmlEAM = await loadEatAndMeetHtmlJquery(SOURCE_EAT_AND_MEET);
  const htmlNH = await loadNaseHospodaHtmlJquery(SOURCE_NASE_HOSPODA);
  const doc1 = parseHtml(htmlEAM);
  const doc2 = parseHtml(htmlNH);

  const mealsEAM = parseEatAndMeetJquery(doc1);
  const commonMealsEAM = parseEatAndMeetCommonMealsJQuery(doc1);

  const mealsNH = parseNaseHospodaJQuery(doc2);
  const special = parseNaseHospodaSpecialJQuery(doc2);

  console.log(mealsEAM);
  console.log(commonMealsEAM);

  console.log(mealsNH);
  console.log(special);
}

main();
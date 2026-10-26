// Your own photos: a page background and pictures on course cards.
"use strict";

const hasImageDrag = e =>
  [...((e.dataTransfer && e.dataTransfer.items) || [])].some(
    i => i.kind === "file" && i.type.startsWith("image/"),
  );
const imageFromDrop = e =>
  [...((e.dataTransfer && e.dataTransfer.files) || [])].find(f => f.type.startsWith("image/")) || null;

function applyPageImage(dataUrl)
{
  if (dataUrl) root.style.setProperty("--bl-page-img", `url("${dataUrl}")`);
  else root.style.removeProperty("--bl-page-img");
  root.classList.toggle("bl-has-bgimg", !!dataUrl);
}
store.get("local", "bl:bgimg").then(applyPageImage);

const cardKey = id => `bl:card:${HOST}:${id}`;
let cardInput = null,
  cardTarget = null;
const CAM =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h2l1.2-1.6h4.6L13.5 5h2A1.5 1.5 0 0 1 17 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="10.5" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const cardId = card =>
{
  const a = card.querySelector('a.ic-DashboardCard__link, a[href*="/courses/"]');
  const m = a && /\/courses\/(\d+)/.exec(a.getAttribute("href") || "");
  return m ? m[1] : null;
};
function paintCard(card, dataUrl)
{
  if (dataUrl) card.style.setProperty("--bl-card-img", `url("${dataUrl}")`);
  else card.style.removeProperty("--bl-card-img");
  card.classList.toggle("bl-photo-card", !!dataUrl);
  const del = card.querySelector(".bl-card-del");
  if (del) del.hidden = !dataUrl;
}
async function saveCardPhoto(card, file)
{
  const id = cardId(card);
  if (!id || !file) return;
  try
  {
    const dataUrl = await self.BlushLook.resizeImage(file, 900, 0.84);
    await store.set("local", cardKey(id), dataUrl);
    paintCard(card, dataUrl);
    toast("New card photo. Cute.", true);
  }
  catch (e)
  {
    toast("That picture would not load.");
  }
}
function decorateCards(scope)
{
  if (!scope || scope.nodeType !== 1) return;
  const cards = scope.matches(".ic-DashboardCard")
    ? [scope]
    : [...scope.querySelectorAll(".ic-DashboardCard")];
  const fresh = cards.filter(c => !c.querySelector(".bl-card-tools") && cardId(c));
  if (!fresh.length) return;
  if (!cardInput)
  {
    cardInput = document.createElement("input");
    cardInput.type = "file";
    cardInput.accept = "image/*";
    cardInput.hidden = true;
    cardInput.addEventListener("change", () =>
    {
      const f = cardInput.files[0];
      cardInput.value = "";
      if (cardTarget) saveCardPhoto(cardTarget, f);
    });
    document.body.appendChild(cardInput);
  }
  chrome.storage.local.get(
    fresh.map(c => cardKey(cardId(c))),
    saved =>
    {
      fresh.forEach(card =>
      {
        const header = card.querySelector(".ic-DashboardCard__header") || card;
        if (card.querySelector(".bl-card-tools")) return;
        const tools = document.createElement("div");
        tools.className = "bl-card-tools";
        tools.innerHTML =
          `<button type="button" class="bl-card-btn bl-card-add" aria-label="Add a photo to this course card" title="Add a photo (or drop one here)">${CAM}</button>` +
          '<button type="button" class="bl-card-btn bl-card-del" aria-label="Remove the card photo" title="Remove photo" hidden>×</button>';
        tools.querySelector(".bl-card-add").addEventListener("click", e =>
        {
          e.preventDefault();
          e.stopPropagation();
          cardTarget = card;
          cardInput.click();
        });
        tools.querySelector(".bl-card-del").addEventListener("click", e =>
        {
          e.preventDefault();
          e.stopPropagation();
          chrome.storage.local.remove(cardKey(cardId(card)));
          paintCard(card, null);
        });
        header.appendChild(tools);
        card.addEventListener("dragover", e =>
        {
          if (hasImageDrag(e))
          {
            e.preventDefault();
            card.classList.add("bl-card-drop");
          }
        });
        card.addEventListener("dragleave", e =>
        {
          if (!card.contains(e.relatedTarget)) card.classList.remove("bl-card-drop");
        });
        card.addEventListener("drop", e =>
        {
          const f = imageFromDrop(e);
          card.classList.remove("bl-card-drop");
          if (!f) return;
          e.preventDefault();
          saveCardPhoto(card, f);
        });
        paintCard(card, saved[cardKey(cardId(card))] || null);
      });
    },
  );
}

export default function getRandomTag(tags) {
  const totalWeight = tags.reduce((sum, tag) => sum + tag.weight, 0);
  let random = Math.random() * totalWeight;
  for (const tag of tags) {
    if (random < tag.weight) return tag;
    random -= tag.weight;
  }
}

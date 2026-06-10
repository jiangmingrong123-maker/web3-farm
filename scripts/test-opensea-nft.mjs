const apiKey = process.env.OPENSEA_API_KEY;
if (!apiKey) {
  console.error("Set OPENSEA_API_KEY first");
  process.exit(1);
}

const contract = "0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a";
const tokenId = "8122";

const res = await fetch(
  `https://api.opensea.io/api/v2/chain/ethereum/contract/${contract}/nfts/${tokenId}`,
  { headers: { Accept: "application/json", "x-api-key": apiKey } },
);
const data = await res.json();
const imageUrl =
  data.nft?.display_image_url ??
  data.nft?.image_url ??
  data.display_image_url ??
  data.image_url;
console.log("status", res.status);
console.log("name", data.nft?.name ?? data.name);
console.log("image_url", imageUrl);
if (imageUrl) {
  const img = await fetch(imageUrl);
  const buf = await img.arrayBuffer();
  console.log("image fetch", img.status, buf.byteLength, img.headers.get("content-type"));
}

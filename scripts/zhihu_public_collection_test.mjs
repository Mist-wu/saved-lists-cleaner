const collectionId = process.argv[2] ?? "21827231";
const url = new URL(`https://www.zhihu.com/api/v4/collections/${collectionId}/contents`);
url.searchParams.set("limit", "5");
url.searchParams.set("offset", "0");

const response = await fetch(url, {
  headers: {
    accept: "application/json",
    "user-agent": "Mozilla/5.0 saved-lists-cleaner-test/0.1",
  },
});

const data = await response.json();
console.log(
  JSON.stringify(
    {
      status: response.status,
      totals: data.paging?.totals,
      count: data.data?.length,
      first: data.data?.[0]
        ? {
            type: data.data[0].type,
            id: data.data[0].id,
            title: data.data[0].question?.title ?? data.data[0].title,
            url: data.data[0].url,
          }
        : null,
    },
    null,
    2,
  ),
);

process.exit(response.ok ? 0 : 1);

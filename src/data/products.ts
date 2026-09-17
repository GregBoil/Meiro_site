export interface ProductVariant {
  id: string;
  name: string;
  stock: number | null;
  priceMnt: number | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: "bags" | "wallets" | "accessories";
  description: string;
  imageDescription: string;
  tone: string;
  priceMnt: number | null;
  availability: "preview" | "available" | "sold-out";
  isPlaceholder: boolean;
  variants: ProductVariant[];
}

// Editorial sample data only. Replace with approved products before enabling sales.
export const products: Product[] = [
  {
    id: "sample-01",
    slug: "everyday-bag",
    name: "Өдөр тутмын цүнх",
    category: "bags",
    description: "Хэрэгтэй бүхнээ багтаах, цэвэрхэн хэлбэртэй арьсан цүнх.",
    imageDescription:
      "Бор арьсан цүнхийг мөрөндөө үүрсэн хүн. Хотын гудамж, байгалийн гэрэл.",
    tone: "taupe",
    priceMnt: null,
    availability: "preview",
    isPlaceholder: true,
    variants: [],
  },
  {
    id: "sample-02",
    slug: "fold-wallet",
    name: "Эвхдэг түрийвч",
    category: "wallets",
    description: "Авсаархан хэмжээ, бодож шийдсэн дотоод зохион байгуулалт.",
    imageDescription:
      "Задалж тавьсан арьсан түрийвч. Доторх тасалгаа, арьсны ширхэг тод харагдана.",
    tone: "sage",
    priceMnt: null,
    availability: "preview",
    isPlaceholder: true,
    variants: [],
  },
  {
    id: "sample-03",
    slug: "card-holder",
    name: "Картны гэр",
    category: "wallets",
    description: "Зөвхөн хэрэгтэй зүйлсээ. Халаасанд эвтэйхэн нимгэн загвар.",
    imageDescription:
      "Картны гэрийг гартаа барьсан ойрын зураг. Хажуугаас туссан зөөлөн гэрэл.",
    tone: "clay",
    priceMnt: null,
    availability: "preview",
    isPlaceholder: true,
    variants: [],
  },
  {
    id: "sample-04",
    slug: "crossbody",
    name: "Мөрөвчтэй цүнх",
    category: "bags",
    description: "Чөлөөтэй алхахад тань хамт байх хөнгөн цүнх.",
    imageDescription:
      "Мөрөвчтэй жижиг цүнх зүүсэн хүн. Энгийн хувцаслалт, хөдөлгөөнтэй агшин.",
    tone: "sand",
    priceMnt: null,
    availability: "preview",
    isPlaceholder: true,
    variants: [],
  },
  {
    id: "sample-05",
    slug: "key-holder",
    name: "Түлхүүрийн оосор",
    category: "accessories",
    description: "Өдөр бүр хүрэх жижигхэн зүйлд ч ур хийц шингэнэ.",
    imageDescription:
      "Арьсан түлхүүрийн оосрын оёдол, ирмэгийг харуулсан ойрын зураг.",
    tone: "charcoal",
    priceMnt: null,
    availability: "preview",
    isPlaceholder: true,
    variants: [],
  },
  {
    id: "sample-06",
    slug: "notebook-cover",
    name: "Тэмдэглэлийн дэвтрийн гэр",
    category: "accessories",
    description: "Бодол, санаа, шинэ зам бүрийг тань хадгална.",
    imageDescription:
      "Арьсан гэртэй дэвтэр цайвар ширээн дээр. Хажууд нь үзэг, цонхны гэрэл.",
    tone: "rose",
    priceMnt: null,
    availability: "preview",
    isPlaceholder: true,
    variants: [],
  },
];

export const formatPrice = (price: number | null) =>
  price === null
    ? "Үнэ удахгүй"
    : `${new Intl.NumberFormat("mn-MN").format(price)} ₮`;

export const categories = [
  { id: "all", label: "Бүгд" },
  { id: "bags", label: "Цүнх" },
  { id: "wallets", label: "Түрийвч" },
  { id: "accessories", label: "Жижиг эдлэл" },
] as const;

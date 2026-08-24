export type BackgroundCategory = "white" | "black" | "gray" | "studio" | "product" | "gradient" | "minimal" | "advertising";

export type BackgroundLibraryItem = { id: string; category: BackgroundCategory; nameKey: "backgroundWhite" | "backgroundBlack" | "backgroundGray" | "backgroundStudio" | "backgroundProduct" | "backgroundGradient" | "backgroundMinimal" | "backgroundAdvertising"; imageUrl: string; thumbnailUrl: string; color?: string };

export const backgroundLibrary: BackgroundLibraryItem[] = [
  { id: "white", category: "white", nameKey: "backgroundWhite", imageUrl: "/backgrounds/white.png", thumbnailUrl: "/backgrounds/white.png", color: "#fafafa" },
  { id: "black", category: "black", nameKey: "backgroundBlack", imageUrl: "/backgrounds/black.png", thumbnailUrl: "/backgrounds/black.png", color: "#121216" },
  { id: "gray", category: "gray", nameKey: "backgroundGray", imageUrl: "/backgrounds/gray.png", thumbnailUrl: "/backgrounds/gray.png", color: "#9ca3af" },
  { id: "studio", category: "studio", nameKey: "backgroundStudio", imageUrl: "/backgrounds/studio.png", thumbnailUrl: "/backgrounds/studio.png" },
  { id: "product", category: "product", nameKey: "backgroundProduct", imageUrl: "/backgrounds/product.png", thumbnailUrl: "/backgrounds/product.png" },
  { id: "gradient", category: "gradient", nameKey: "backgroundGradient", imageUrl: "/backgrounds/gradient.png", thumbnailUrl: "/backgrounds/gradient.png" },
  { id: "minimal", category: "minimal", nameKey: "backgroundMinimal", imageUrl: "/backgrounds/minimal.png", thumbnailUrl: "/backgrounds/minimal.png" },
  { id: "advertising", category: "advertising", nameKey: "backgroundAdvertising", imageUrl: "/backgrounds/advertising.png", thumbnailUrl: "/backgrounds/advertising.png" }
];

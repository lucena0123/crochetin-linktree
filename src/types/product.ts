export interface ProductDimensions {
    width: number;
    height: number;
    depth: number;
}

export interface Product {
    id: string;
    slug: string;
    name: string;
    description: string;
    price: number;
    lessonUrl?: string;
    category: string;
    images: string[];
    colors: string[];
    material?: string;
    dimensions: ProductDimensions;
    inStock: boolean;
    featured: boolean;
    limited?: boolean;
    tags: string[];
    benefits?: string[];
}

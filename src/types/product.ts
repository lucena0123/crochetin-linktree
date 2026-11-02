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
    /** Número de aulas desta bolsa no Treinamento */
    lessons?: number;
    /** Preço da aula avulsa na Hotmart (R$) */
    lessonPrice?: number;
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

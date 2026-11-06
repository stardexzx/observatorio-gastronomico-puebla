import { stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

export type RecipeBookFile = {id:string;title:string;subtitle:string;filename:string};

/** The reference catalog may arrive without its PDFs; only real files open the reader. */
export async function inspectRecipeBookFiles<T extends RecipeBookFile>(books: readonly T[], directory: string) {
  return Promise.all(books.map(async book => {
    let available = false;
    if (basename(book.filename) === book.filename && book.filename.toLowerCase().endsWith('.pdf')) {
      try {const file = await stat(join(directory,book.filename)); available = file.isFile() && file.size > 0;}
      catch { /* The catalog reference remains visible while the attachment is missing. */ }
    }
    return {...book,available};
  }));
}

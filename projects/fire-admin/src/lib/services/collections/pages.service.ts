import { Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { UsersService } from './users.service';
import { AuthService } from '../auth.service';
import { DocumentTranslationsService } from './abstract/document-translations.service';
import { Page, PageBlock, PageTranslation } from '../../models/collections/page.model';
import { now } from '../../helpers/functions.helper';
import { mergeMap, take, map } from 'rxjs/operators';
import { SettingsService } from '../settings.service';
import { Language } from '../../models/language.model';
import { Observable, of } from 'rxjs';
import { User } from '../../models/collections/user.model';
import { QueryFn } from '@angular/fire/firestore';

@Injectable()
export class PagesService extends DocumentTranslationsService {

  constructor(
    protected db: DatabaseService,
    private settings: SettingsService,
    private users: UsersService,
    private auth: AuthService
  ) {
    super(db, 'pageTranslations');
  }

  add(data: Page, translationId?: string) {
    const page: Page = {
      title: data.title,
      lang: data.lang,
      slug: data.slug,
      blocks: [],
      createdAt: now(), // timestamp
      updatedAt: null,
      createdBy: this.auth.currentUser.id,
      updatedBy: null
    };
    data.blocks.forEach((block: PageBlock|any, index: number) => {
      let key = block.key;
      if (page.blocks[key]) {
        key += '-' + index;
      }
      page.blocks[key] = {
        name: block.name,
        type: block.type,
        content: block.content
      };
    });
    return new Promise((resolve, reject) => {
      this.db.addDocument('pages', page).then((doc: any) => {
        this.addTranslation(data.lang, doc.id, translationId).then((translation: any) => {
          doc.set({ translationId: translationId || translation.id}, { merge: true }).then(() => {
            resolve();
          }).catch((error: Error) => {
            reject(error);
          });
        }).catch((error: Error) => {
          reject(error);
        });
      }).catch((error: Error) => {
        reject(error);
      });
    });
  }

  translate(data: Page) {
    return this.add(data, data.translationId);
  }

  get(id: string) {
    return this.db.getDocument('pages', id).pipe(mergeMap(async (page: Page) => {
      const translations = await this.getTranslations(page.translationId).pipe(take(1)).toPromise();
      page.id = id;
      page.translations = translations;
      return page;
    }));
  }

  getTranslationLanguages(page: Page) {
    const pageLanguages = Object.keys(page.translations);
    return this.settings.getActiveSupportedLanguages().filter((lang: Language) => pageLanguages.indexOf(lang.key) === -1);
  }

  private pipePages(pagesObservable: Observable<Page[]>) {
    return pagesObservable.pipe(mergeMap(async (pages: Page[]) => {
      const activeSupportedLanguages = this.settings.getActiveSupportedLanguages().map((lang: Language) => lang.key);
      //pages.forEach((page: Page) => { // forEach loop doesn't seems to work well with async/await
      for (let page of pages) {
        // console.log(page);
        page.translations = await this.getTranslations(page.translationId).pipe(take(1)).toPromise();
        // console.log(page.translations);
        const pageLanguages = Object.keys(page.translations);
        page.author = page.createdBy ? this.users.get(page.createdBy).pipe(map((user: User) => `${user.firstName} ${user.lastName}`)) : of(null);
        page.isTranslatable = !activeSupportedLanguages.every((lang: string) => pageLanguages.includes(lang));
      }
      //});
      return pages;
    }));
  }

  getAll() {
    return this.pipePages(this.db.getCollection('pages'));
  }

  getWhere(field: string, operator: firebase.firestore.WhereFilterOp, value: string, applyPipe: boolean = false) {
    const pagesObservable = this.db.getCollection('pages', ref => ref.where(field, operator, value));
    return applyPipe ? this.pipePages(pagesObservable) : pagesObservable;
  }

  getWhereFn(queryFn: QueryFn, applyPipe: boolean = false) {
    const pagesObservable = this.db.getCollection('pages', queryFn);
    return applyPipe ? this.pipePages(pagesObservable) : pagesObservable;
  }

  edit(id: string, data: Page) {
    const page: Page = {
      title: data.title,
      lang: data.lang,
      slug: data.slug,
      blocks: [],
      updatedAt: now(),
      updatedBy: this.auth.currentUser.id
    };
    data.blocks.forEach((block: PageBlock|any, index: number) => {
      let key = block.key;
      if (page.blocks[key]) {
        key += '-' + index;
      }
      page.blocks[key] = {
        name: block.name,
        type: block.type,
        content: block.content
      };
    });
    return this.db.setDocument('pages', id, page);
  }

  delete(id: string, data: { lang: string, translationId: string, translations: PageTranslation }) {
    return new Promise((resolve, reject) => {
      this.deleteTranslation(data.translationId, data.lang, data.translations).then(() => { // should be done before deleting document (pages observable will be synced before if not)
        this.db.deleteDocument('pages', id).then(() => {
          resolve();
        }).catch((error: Error) => {
          reject(error);
        });
      }).catch((error: Error) => {
        reject(error);
      });
    });
  }

}

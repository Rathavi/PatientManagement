import { Injectable } from "@angular/core";
import { AlertType } from '../models/alert-type.model';
import { StorageService } from './storage.service';

@Injectable()
export class AlertService {

  message: string = null;
  type: AlertType = 'primary';
  icon: string = null;

  constructor(private storage: StorageService) {
    const alert = this.storage.get('flash_alert');
    if (alert) {
      this.set(alert.message, alert.type);
      this.storage.set('flash_alert', null);
      if (alert.timeout) {
        setTimeout(() => this.clear(), alert.timeout);
      }
    }
  }

  private set(message: string, type: AlertType, isFlashAlert: boolean = false, timeout: number = null) {
    if (isFlashAlert) {
      this.storage.set('flash_alert', {
        message: message,
        type: type,
        timeout: timeout
      });
    } else {
      this.message = message;
      this.type = type;
      switch(this.type) {
        case 'primary':
          this.icon = 'info';
          break;
        case 'warning':
          this.icon = 'exclamation';
          break;
        default:
          this.icon = null;
      }
      if (timeout) {
        setTimeout(() => this.clear(), timeout);
      }
    }
  }

  clear(clearFlashAlert: boolean = false) {
    this.message = null;
    if (clearFlashAlert) {
      this.storage.set('flash_alert', null);
    }
  }

  info(message: string, isFlashAlert: boolean = false, timeout: number = null) {
    this.set(message, 'primary', isFlashAlert, timeout);
  }

  success(message: string, isFlashAlert: boolean = false, timeout: number = null) {
    this.set(message, 'success', isFlashAlert, timeout);
  }

  error(message: string, isFlashAlert: boolean = false, timeout: number = null) {
    this.set(message, 'danger', isFlashAlert, timeout);
  }

  warning(message: string, isFlashAlert: boolean = false, timeout: number = null) {
    this.set(message, 'warning', isFlashAlert, timeout);
  }

}
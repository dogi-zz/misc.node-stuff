import {combineLatest, Observable, Subscriber, Subscription} from 'rxjs';
import {filter, map} from 'rxjs/operators';


export const isObservable = (obj: any) => {
  return obj instanceof Observable;
};

export const mapObservable: <T, O>(input: Observable<T>, mapFunction: (source: T) => O, throttleTime?: number) => Observable<O> = <T, O>(input, mapFunction, throttleTime) => {
  return input.pipe(
      map(current => mapFunction(current)),
      replayLatest(throttleTime),
  );
};

export const mapObservableAsync: <T, O>(input: Observable<T>, mapFunction: (source: T) => Promise<O>) => Observable<O> = <T, O>(input, mapFunction) => {
  let subscribers: Subscriber<O>[] = [];
  let subscription: Subscription;
  return new Observable<O>(subscriber => {
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      subscription = input.subscribe(data => {
        mapFunction(data).then(result => {
          subscribers.forEach(s => s.next(result));
        });
      });
    }
    return {
      unsubscribe() {
        subscribers = subscribers.filter(s => s !== subscriber);
        if (!subscribers.length) {
          subscription?.unsubscribe();
        }
      },
    };
  });
};

export const chainObservable: <T, O>(input: Observable<T>, mapFunction: (source: T) => Observable<O>) => Observable<O> = <T, O>(input, mapFunction) => {
  let subscribers: Subscriber<O>[] = [];
  let subscription1: Subscription;
  let subscription2: Subscription;
  let lastResult : O;
  let hasResult = false;
  return new Observable<O>(subscriber => {
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      subscription1 = input.subscribe(data => {
        lastResult = null;
        hasResult = false;
        subscription2?.unsubscribe();
        subscription2 = mapFunction(data).subscribe(result => {
          lastResult = result;
          hasResult = true;
          subscribers.forEach(s => s.next(result));
        });
      });
    } else {
      if (hasResult){
        subscriber.next(lastResult);
      }
    }
    return {
      unsubscribe() {
        subscribers = subscribers.filter(s => s !== subscriber);
        if (!subscribers.length) {
          subscription1?.unsubscribe();
          subscription2?.unsubscribe();
        }
      },
    };
  });
};



export const observableFromObservablePromise: <T>(input: Promise<Observable<T>>) => Observable<T> = <T>(input) => {
  let subscribers: Subscriber<T>[] = [];
  let subscription: Subscription;
  return new Observable<T>(subscriber => {
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      input.then(inputObservable => {
        subscription = inputObservable.subscribe(data => {
          subscribers.forEach(s => s.next(data));
        });
      });
    }
    return {
      unsubscribe() {
        subscribers = subscribers.filter(s => s !== subscriber);
        if (!subscribers.length) {
          subscription?.unsubscribe();
        }
      },
    };
  });
};

export const promiseAsObservable = <T>(promise: Promise<T>) => {
  return new Observable<T>(subscriber => {
    let isAvtive = true;
    promise.then(value => {
      if (isAvtive) {
        subscriber.next(value);
      }
    });
    return {
      unsubscribe() {
        isAvtive = false;
      },
    };
  });
};



export const replayLatest = (throttleTime?: number) => {
  return <T>(source: Observable<T>): Observable<T> => {
    let subscribers: Subscriber<T>[];
    let subscription: Subscription;
    let lastValue: T;
    let timeout: any;
    let hasValue = false;
    return new Observable(subscriber => {
      if (!subscribers) {
        subscribers = [subscriber];
        hasValue = false;
        subscription = source.subscribe({
          next(value) {
            lastValue = value;
            hasValue = true;
            if (throttleTime) {
              if (!timeout){
                timeout = setTimeout(() => {
                  timeout = null;
                  subscribers.forEach(s => s.next(lastValue));
                }, throttleTime);
              }
            } else {
              subscribers.forEach(s => s.next(lastValue));
            }
          },
          error(error) {
            if (throttleTime){
              console.info('CLAER');
            }
            clearTimeout(timeout);
            subscriber.error(error);
          },
          complete() {
            if (throttleTime){
              console.info('CLAER');
            }
            clearTimeout(timeout);
            subscriber.complete();
          },
        });
      } else {
        subscribers.push(subscriber);
        if (hasValue) {
          subscriber.next(lastValue);
        }
      }
      return {
        unsubscribe() {
          subscribers = subscribers.filter(s => s !== subscriber);
          if (!subscribers.length) {
            clearTimeout(timeout);
            lastValue = undefined;
            subscribers = null;
            subscription?.unsubscribe();
            if (throttleTime === 123) {
              console.info('unsub...');
            }
          }
        },
      };
    });
  };
};


export class SubscriptionList {

  private _subscriptions: Subscription[] = [];
  private _subscriptionsByKey: { key: string, subscription: Subscription }[] = [];

  public subscribe<T>(observable: Observable<T>, subscribe: (data: T) => void): Subscription {
    const subscription = observable.subscribe(subscribe);
    this._subscriptions.push(subscription);
    subscription.add(() => {
      this._subscriptions = this._subscriptions.filter(s => s !== subscription);
    });
    return subscription;
  }

  public subscribeWithKey<T>(key: string, observable: Observable<T>, subscribe: (data: T) => void): Subscription {
    const subscription = observable.subscribe(subscribe);
    this._subscriptions.push(subscription);
    this._subscriptionsByKey.push({key, subscription});
    subscription.add(() => {
      this._subscriptions = this._subscriptions.filter(s => s !== subscription);
    });
    return subscription;
  }

  public unsubscribe(key?: string) {
    if (key) {
      this._subscriptionsByKey.filter(s => s.key === key).forEach(({subscription}) => subscription.unsubscribe());
      this._subscriptionsByKey = this._subscriptionsByKey.filter(s => s.key !== key);
    } else {
      this._subscriptions.forEach(subscription => subscription.unsubscribe());
      this._subscriptions.splice(0);
      this._subscriptionsByKey.splice(0);
    }
  }
}

/**
 * Pendant uzm BehaviorSubject, nur cooler
 */
export class DcReplaySubject<T> extends Observable<T> {
  private observers: Subscriber<T>[] = [];
  public value: T;
  private haveValue = false;

  private updatePromises: ((item: T) => void)[] = [];

  private onStart: () => void;
  private onStop: () => void;

  constructor(startValue?: T) {
    super((observer) => {
      this.observers.push(observer);
      if (this.haveValue) {
        observer.next(this.value);
      }
      if (this.observers.length === 1 && this.onStart) {
        this.onStart();
      }
      return {
        unsubscribe: () => {
          this.observers = this.observers.filter((o) => o !== observer);
          if (this.observers.length === 0 && this.onStop) {
            this.onStop();
          }
        },
      };
    });
    if (startValue !== undefined) {
      setTimeout(() => {
        this.next(startValue);
      });
    }
  }

  public getFromNow(): Observable<T>{
    if (this.haveValue){
      let firstValueReceived = false;
      return this.pipe(filter(() => {
        if (firstValueReceived){
          return true;
        } else {
          firstValueReceived = true;
          return false;
        }
      }));
    } else {
      return this;
    }
  }

  public setActions(onStart: () => void, onStop: () => void) {
    this.onStart = onStart;
    this.onStop = onStop;
    if (this.observers.length && this.onStart) {
      this.onStart();
    }
  }

  public next(value: T) {
    this.haveValue = true;
    this.value = value;
    this.observers.forEach((o) => {
      try {
        o.next(this.value);
      } catch (e) {
        console.error(e);
      }
    });
    this.updatePromises.splice(0).forEach((res) => {
      try {
        res(this.value);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public isNew() {
    return !this.haveValue;
  }

  public getNextAsPromise(): Promise<T> {
    return new Promise((res) => this.updatePromises.push(res));
  }
}

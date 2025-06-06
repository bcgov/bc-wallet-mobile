import { useState } from 'react'

export type RetryConfig = {
   /**
   * Interval in milliseconds to poll the data.
   * If set, the `fetchData` function will be called at backed off multiples of this interval.
   * Example: If set to 1000, the `fetchData` function will be called at 1000ms, 2000ms, 4000ms, etc.
   * If not set, the `fetchData` function will only be called when `load` or `refresh` is called.
   */
  interval: number
  /**
   * Timeout in milliseconds for the data fetch.
   * If set, the `fetchData` function will be aborted if it takes longer than this time and
   * the `onError` function will be called with a timeout error.
   */
  timeout: number
}

export type DataLoaderOptions = {
  retryConfig?: RetryConfig
  /**
   * Error handler function that will be called if the `fetchData` function throws an error
   * NOT OPTIONAL so we are forced to handle errors
   */
  onError: (error: unknown) => void
};

export type DataLoader<ResponseType> = {
  /**
   * The response of the `fetchData` call
   *
   * @type {(ResponseType | undefined)}
   */
  data: ResponseType | undefined
  /**
   * The error caught if the `fetchData` call throws
   *
   * @type {(unknown)}
   */
  error: unknown
  /**
   * `true` if the `fetchData` function is currently executing
   *
   * @type {boolean}
   */
  isLoading: boolean
  /**
   * `true` if data has been loaded at least once
   * 
   * @type {boolean}
   */
  isReady: boolean
  /**
   * Executes the `fetchData` function once, only if it has never been called before. Does nothing if called again
   */
  load: () => void;
  /**
   * Executes the `fetchData` function again
   */
  refresh: () => void;
  /**
   * Clears any errors caught from a failed `fetchData` call
   */
  clear: () => void;
  /**
   * Setter for manually handling data. Useful for sorting
   */
  setData: (data: ResponseType) => void;
};

/**
 * A custom hook that provides a data loader for fetching data
 *
 * @export
 * @template ResponseType typed structure of the data
 * @param {() => Promise<ResponseType>} fetchData return a promise that resolves to the data to be loaded, usually an API call
 * @param {DataLoaderOptions} options
 * @return {DataLoader<ResponseType>}
 */
export default function useDataLoader<ResponseType>(
  fetchData: () => Promise<ResponseType>,
  options: DataLoaderOptions
): DataLoader<ResponseType> {
  const [data, setData] = useState<ResponseType>()
  const [error, setError] = useState<unknown>()
  const [isLoading, setIsLoading] = useState(false)
  const [isOneTimeLoad, setOneTimeLoad] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const { onError, retryConfig } = options
  const { interval, timeout } = retryConfig ?? {}

  // Custom setData function that also updates isReady state
  const setDataWithReady = (newData: ResponseType) => {
    setData(newData)
    setIsReady(true)
  }

  const loadData = async () => {
    try {
      if (isOneTimeLoad) {
        return
      }

      setOneTimeLoad(true)
      setIsLoading(true)

      let lastError: unknown
      
      if (interval && timeout) {
        let retryCount = 0
        const startTime = Date.now()
        
        // Keep retrying until timeout is reached
        while (Date.now() - startTime < timeout) {
          try {
            const response = await fetchData()
            setDataWithReady(response)
            return
          } catch (err) {
            lastError = err
            
            retryCount++;
            const backoffMs = Math.min(
              interval * Math.pow(2, retryCount - 1),
              // don't wait longer than remaining timeout
              timeout - (Date.now() - startTime)
            )
            
            // if no time left for retries, break
            if (backoffMs <= 0) break;
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
        
        throw new Error(`Operation timed out after ${timeout}ms${
          lastError ? `: ${lastError}` : ''
        }`);
      } else {
        const response = await fetchData();
        setDataWithReady(response)
      }
    } catch (error) {
      setError(error)
      onError(error)
    } finally {
      setIsLoading(false)
    }
  };

  // Function to trigger load once
  const load = () => {
    if (!isLoading && !isOneTimeLoad) {
      loadData();
    }
  }

  // Function to refresh data
  const refresh = () => {
    setError(undefined);
    setOneTimeLoad(false); // Reset one-time load so we can fetch again
    loadData();
  };

  // Function to clear errors
  const clear = () => {
    setError(undefined)
  }


  return { 
    data, 
    error, 
    isLoading, 
    isReady, 
    load, 
    refresh, 
    clear, 
    setData: setDataWithReady 
  };
}
import { ImATeapot } from '@library/httpError'

export default function (): void {
  throw new ImATeapot("I'm sorry, but this server is powered by Teapot™");
}
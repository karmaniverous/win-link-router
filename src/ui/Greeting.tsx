interface GreetingProps {
  name: string;
}

export function Greeting({ name }: GreetingProps) {
  return <span>Hello {name}</span>;
}

import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
    return [{ title: "Gommerce" }, { name: "description", content: "An open source e-commerce system written in go." }];
};

export default function Index() {
    return <></>;
}

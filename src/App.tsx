import { assign, fromPromise, setup } from "xstate";
import { useActor } from "@xstate/react";
import { Button } from "./Button";
import clsx from "clsx";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

interface Asset {
  id: string;
  code: string;
  type: "TREE" | "FUND" | "STRATEGY";
  name: string;
  weight: string;
}

const fetchAssets = fromPromise<{ assets: Array<Asset> }>(async () => {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

  const emptyAssets = window.location.search.includes("empty");

  if (emptyAssets) {
    return { assets: [] };
  }

  return {
    assets: [
      {
        id: "1",
        code: "123aq1",
        type: "TREE",
        name: "Tree A",
        weight: "10%",
      },
      {
        id: "2",
        code: "456aq2",
        type: "STRATEGY",
        name: "Strategy B",
        weight: "20%",
      },
      {
        id: "3",
        code: "789aq3",
        type: "FUND",
        name: "Fund C",
        weight: "30%",
      },
      {
        id: "4",
        code: "101aq4",
        type: "FUND",
        name: "Fund D",
        weight: "70%",
      },
    ] satisfies Array<Asset>,
  };
});

const deleteAsset = fromPromise<void, { assetId: string }>(
  async ({ input: { assetId } }) => {
    console.log("Deleting asset", assetId);

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
  }
);

const addAsset = fromPromise<Asset, { assetId: string }>(
  async ({ input: { assetId } }) => {
    console.log("Adding asset", assetId);

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

    return {
      id: assetId,
      code: "new-code",
      type: "FUND",
      name: assetId,
      weight: "50%",
    };
  }
);

const replaceAsset = fromPromise<
  Asset,
  { oldAssetId: string; newAssetId: string }
>(async ({ input: { oldAssetId, newAssetId } }) => {
  console.log("Replacing asset", oldAssetId, "with", newAssetId);

  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

  return {
    id: newAssetId,
    code: "new-code",
    type: "FUND",
    name: newAssetId,
    weight: "50%",
  };
});

const importData = fromPromise<{ assets: Array<Asset> }>(async () => {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

  return {
    assets: [
      {
        id: "5",
        code: "new-code",
        type: "FUND",
        name: "New Fund",
        weight: "50%",
      },
      {
        id: "6",
        code: "new-code-2",
        type: "FUND",
        name: "New Fund 2",
        weight: "50%",
      },
    ],
  };
});

const treeMachine = setup({
  types: {
    context: {} as {
      selectedFund: string | undefined;
      selectedAssetId: string | undefined;
      assets: Array<Asset>;
    },
    events: {} as
      | {
          type: "SELECT_FUND";
          fund: string;
        }
      | {
          type: "SELECT_ASSET";
          assetId: string;
        }
      | {
          type: "UNSELECT_ASSET";
        }
      | {
          type: "DELETE_ASSET";
        }
      | {
          type: "ADD_ASSET";
        }
      | {
          type: "REPLACE_ASSET";
        }
      | {
          type: "OPEN_IMPORT_DIALOG";
        }
      | {
          type: "CLOSE_IMPORT_DIALOG";
        }
      | {
          type: "IMPORT_DATA";
        },
    tags: {} as "Synchronizing",
  },
  actors: {
    "Fetch assets": fetchAssets,
    "Delete asset": deleteAsset,
    "Add asset": addAsset,
    "Replace asset": replaceAsset,
    "Import data": importData,
  },
}).createMachine({
  id: "Tree",
  context: {
    selectedFund: undefined,
    selectedAssetId: undefined,
    assets: [],
  },
  initial: "Loading initial data",
  states: {
    "Loading initial data": {
      tags: "Synchronizing",
      invoke: {
        src: "Fetch assets",
        onDone: {
          target: "Idle",
          actions: assign({
            assets: ({ event }) => event.output.assets,
          }),
        },
        onError: {
          target: "Idle",
          actions: assign({
            assets: [],
          }),
        },
      },
    },
    Idle: {
      on: {
        DELETE_ASSET: {
          guard: ({ context }) => context.selectedAssetId !== undefined,
          target: "Deleting asset",
        },
        ADD_ASSET: {
          guard: ({ context }) => context.selectedFund !== undefined,
          target: "Adding asset",
        },
        REPLACE_ASSET: {
          guard: ({ context }) =>
            context.selectedAssetId !== undefined &&
            context.selectedFund !== undefined,
          target: "Replacing asset",
        },
        OPEN_IMPORT_DIALOG: {
          target: "Import dialog opened",
        },
      },
    },
    "Deleting asset": {
      tags: "Synchronizing",
      invoke: {
        src: "Delete asset",
        input: ({ context }) => {
          if (context.selectedAssetId === undefined) {
            throw new Error("No asset selected");
          }

          return {
            assetId: context.selectedAssetId,
          };
        },
        onDone: {
          target: "Idle",
          actions: assign({
            selectedAssetId: undefined,
            assets: ({ context }) =>
              context.assets.filter(
                (asset) => asset.id !== context.selectedAssetId
              ),
          }),
        },
        onError: {
          target: "Idle",
          actions: assign({
            selectedAssetId: undefined,
            assets: ({ context }) =>
              context.assets.filter(
                (asset) => asset.id !== context.selectedAssetId
              ),
          }),
        },
      },
    },
    "Adding asset": {
      tags: "Synchronizing",
      invoke: {
        src: "Add asset",
        input: ({ context }) => {
          if (context.selectedFund === undefined) {
            throw new Error("No fund selected");
          }

          return {
            assetId: context.selectedFund,
          };
        },
        onDone: {
          target: "Idle",
          actions: assign({
            selectedFund: undefined,
            assets: ({ context, event }) => context.assets.concat(event.output),
          }),
        },
        onError: {
          target: "Idle",
          actions: assign({
            selectedFund: undefined,
          }),
        },
      },
    },
    "Replacing asset": {
      tags: "Synchronizing",
      invoke: {
        src: "Replace asset",
        input: ({ context }) => {
          if (
            context.selectedAssetId === undefined ||
            context.selectedFund === undefined
          ) {
            throw new Error("No asset or fund selected");
          }

          return {
            oldAssetId: context.selectedAssetId,
            newAssetId: context.selectedFund,
          };
        },
        onDone: {
          target: "Idle",
          actions: assign({
            selectedAssetId: undefined,
            selectedFund: undefined,
            assets: ({ context, event }) =>
              context.assets
                .filter((asset) => asset.id !== context.selectedAssetId)
                .concat(event.output),
          }),
        },
        onError: {
          target: "Idle",
          actions: assign({
            selectedAssetId: undefined,
            selectedFund: undefined,
          }),
        },
      },
    },
    "Import dialog opened": {
      initial: "Idle",
      states: {
        Idle: {
          on: {
            IMPORT_DATA: {
              target: "Importing data",
            },
          },
        },
        "Importing data": {
          invoke: {
            src: "Import data",
            onDone: {
              target: "Done",
              actions: assign({
                assets: ({ context, event }) =>
                  context.assets.concat(event.output.assets),
              }),
            },
          },
        },
        Done: {
          type: "final",
        },
      },
      on: {
        CLOSE_IMPORT_DIALOG: {
          target: "Idle",
        },
      },
      onDone: {
        target: "Idle",
      },
    },
  },
  on: {
    SELECT_FUND: {
      actions: assign({
        selectedFund: ({ event }) => event.fund,
      }),
    },
    SELECT_ASSET: {
      actions: assign({
        selectedAssetId: ({ event }) => event.assetId,
      }),
    },
    UNSELECT_ASSET: {
      actions: assign({
        selectedAssetId: undefined,
      }),
    },
  },
});

const funds = [
  "FUND – AAA",
  "FUND – BBB",
  "FUND – CCC",
  "FUND – DDD",
  "FUND – EEE",
  "FUND – FFF",
];

function App() {
  const [state, send] = useActor(treeMachine);

  console.log("state", state);

  const isSynchronizing = state.hasTag("Synchronizing");
  const canDeleteAsset = state.can({ type: "DELETE_ASSET" });
  const canAddAsset = state.can({ type: "ADD_ASSET" });
  const canReplaceAsset = state.can({ type: "REPLACE_ASSET" });

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center">
        <Button
          disabled={!canDeleteAsset}
          onClick={() => {
            send({
              type: "DELETE_ASSET",
            });
          }}
        >
          Delete
        </Button>

        <div className="flex items-center gap-x-2">
          <select
            disabled={isSynchronizing}
            defaultValue=""
            value={state.context.selectedFund ?? ""}
            onChange={(event) => {
              send({
                type: "SELECT_FUND",
                fund: event.target.value,
              });
            }}
          >
            <option value="">---</option>

            {funds.map((fund) => (
              <option key={fund} value={fund}>
                {fund}
              </option>
            ))}
          </select>

          <Button
            disabled={!canAddAsset}
            onClick={() => {
              send({
                type: "ADD_ASSET",
              });
            }}
          >
            Add
          </Button>

          <Button
            disabled={!canReplaceAsset}
            onClick={() => {
              send({
                type: "REPLACE_ASSET",
              });
            }}
          >
            Replace
          </Button>
        </div>

        <Button
          disabled={isSynchronizing}
          onClick={() => {
            send({
              type: "OPEN_IMPORT_DIALOG",
            });
          }}
        >
          Import
        </Button>
      </header>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="relative">
              <table className="min-w-full table-fixed divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                      <div className="group absolute left-4 top-1/2 -mt-2 grid size-4 grid-cols-1"></div>
                    </th>
                    <th
                      scope="col"
                      className="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                    >
                      Asset Code
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Asset Type
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Asset Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Strategic Weight
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {state.context.assets.map((asset) => {
                    const isSelectedAsset =
                      state.context.selectedAssetId === asset.id;

                    return (
                      <tr
                        key={asset.id}
                        className={isSelectedAsset ? "bg-gray-50" : undefined}
                      >
                        <td className="relative px-7 sm:w-12 sm:px-6">
                          {isSelectedAsset && (
                            <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-600" />
                          )}
                          <div className="group absolute left-4 top-1/2 -mt-2 grid size-4 grid-cols-1">
                            <input
                              type="checkbox"
                              className="col-start-1 row-start-1 appearance-none rounded border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 indeterminate:border-blue-600 indeterminate:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                              value={asset.id}
                              checked={isSelectedAsset}
                              disabled={isSynchronizing}
                              onChange={(event) => {
                                if (isSelectedAsset) {
                                  send({
                                    type: "UNSELECT_ASSET",
                                  });
                                } else {
                                  send({
                                    type: "SELECT_ASSET",
                                    assetId: event.target.value,
                                  });
                                }
                              }}
                            />
                            <svg
                              className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-gray-950/25"
                              viewBox="0 0 14 14"
                              fill="none"
                            >
                              <path
                                className="opacity-0 group-has-[:checked]:opacity-100"
                                d="M3 8L6 11L11 3.5"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              />
                              <path
                                className="opacity-0 group-has-[:indeterminate]:opacity-100"
                                d="M3 7H11"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              />
                            </svg>
                          </div>
                        </td>
                        <td
                          className={clsx(
                            "whitespace-nowrap py-4 pr-3 text-sm font-medium inline-flex items-center gap-x-2",
                            isSelectedAsset ? "text-blue-600" : "text-gray-900",
                            {
                              "pl-8": asset.type === "STRATEGY",
                              "pl-16": asset.type === "FUND",
                            }
                          )}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="size-4"
                          >
                            {asset.type === "STRATEGY" ||
                            asset.type === "TREE" ? (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                              />
                            ) : (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                              />
                            )}
                          </svg>

                          {asset.code}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {asset.type}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {asset.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {asset.weight}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={state.matches("Import dialog opened")}
        onClose={() => {
          send({ type: "CLOSE_IMPORT_DIALOG" });
        }}
        className="relative z-10"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
            >
              <div>
                <div className="text-center sm:mt-5">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Import data
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to import data?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 space-y-2">
                <button
                  disabled={
                    !state.matches({
                      "Import dialog opened": "Idle",
                    })
                  }
                  type="button"
                  onClick={() => {
                    send({ type: "IMPORT_DATA" });
                  }}
                  className="inline-flex w-full justify-center rounded-md disabled:bg-blue-300 bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
                >
                  {!state.matches({
                    "Import dialog opened": "Idle",
                  })
                    ? "Loading..."
                    : "Import data"}
                </button>
                <button
                  type="button"
                  disabled={
                    !state.matches({
                      "Import dialog opened": "Idle",
                    })
                  }
                  onClick={() => {
                    send({ type: "CLOSE_IMPORT_DIALOG" });
                  }}
                  className="inline-flex w-full justify-center rounded-md disabled:bg-red-300 bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default App;

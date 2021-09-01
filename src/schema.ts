const baseProperties = {
  type: "object",
  properties: {
    vpcName: { type: "string" },
    subnets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          names: {
            type: "array",
            items: { type: "string" }
          },
          tagKey: { type: "string" },
          tagValues: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    },
    securityGroups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tagKey: { type: "string" },
          tagValues: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    },
    // DEPRECATED
    subnetNames: {
      type: "array",
      items: { type: "string" }
    },
    securityGroupNames: {
      type: "array",
      items: { type: "string" }
    }
  }
};

export const functionProperties = {
  properties: {
    vpcDiscovery: {
      anyOf: [
        { type: "boolean" },
        baseProperties
      ]
    }
  }
};

export const customProperties = {
  properties: {
    vpcDiscovery: baseProperties
  }
};

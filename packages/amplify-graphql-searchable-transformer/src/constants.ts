const elasticsearch_instance_types = [
  't2.small.elasticsearch',
  't2.medium.elasticsearch',
  'c4.large.elasticsearch',
  'c4.xlarge.elasticsearch',
  'c4.2xlarge.elasticsearch',
  'c4.4xlarge.elasticsearch',
  'c4.8xlarge.elasticsearch',
  'm3.medium.elasticsearch',
  'm3.large.elasticsearch',
  'm3.xlarge.elasticsearch',
  'm3.2xlarge.elasticsearch',
  'm4.large.elasticsearch',
  'm4.xlarge.elasticsearch',
  'm4.2xlarge.elasticsearch',
  'm4.4xlarge.elasticsearch',
  'm4.10xlarge.elasticsearch',
  'r3.large.elasticsearch',
  'r3.xlarge.elasticsearch',
  'r3.2xlarge.elasticsearch',
  'r3.4xlarge.elasticsearch',
  'r3.8xlarge.elasticsearch',
  'r4.large.elasticsearch',
  'r4.xlarge.elasticsearch',
  'r4.2xlarge.elasticsearch',
  'r4.4xlarge.elasticsearch',
  'r4.8xlarge.elasticsearch',
  'r4.16xlarge.elasticsearch',
  'i2.xlarge.elasticsearch',
  'i2.2xlarge.elasticsearch',
  'i3.large.elasticsearch',
  'i3.xlarge.elasticsearch',
  'i3.2xlarge.elasticsearch',
  'i3.4xlarge.elasticsearch',
  'i3.8xlarge.elasticsearch',
  'i3.16xlarge.elasticsearch',
  'r6gd.12xlarge.elasticsearch',
  'ultrawarm1.xlarge.elasticsearch',
  'm5.4xlarge.elasticsearch',
  't3.xlarge.elasticsearch',
  'm6g.xlarge.elasticsearch',
  'm6g.12xlarge.elasticsearch',
  't2.micro.elasticsearch',
  'r6gd.16xlarge.elasticsearch',
  'd2.2xlarge.elasticsearch',
  't3.micro.elasticsearch',
  'm5.large.elasticsearch',
  'd2.4xlarge.elasticsearch',
  't3.small.elasticsearch',
  'c5.2xlarge.elasticsearch',
  'c6g.2xlarge.elasticsearch',
  'd2.8xlarge.elasticsearch',
  'c5.4xlarge.elasticsearch',
  't4g.medium.elasticsearch',
  'c6g.4xlarge.elasticsearch',
  'c6g.xlarge.elasticsearch',
  'c6g.12xlarge.elasticsearch',
  'c5.xlarge.elasticsearch',
  'c5.large.elasticsearch',
  't4g.small.elasticsearch',
  'c5.9xlarge.elasticsearch',
  'c6g.8xlarge.elasticsearch',
  'c6g.large.elasticsearch',
  'd2.xlarge.elasticsearch',
  'ultrawarm1.medium.elasticsearch',
  't3.nano.elasticsearch',
  't3.medium.elasticsearch',
  'm6g.2xlarge.elasticsearch',
  't3.2xlarge.elasticsearch',
  'c5.18xlarge.elasticsearch',
  'm6g.4xlarge.elasticsearch',
  'r6gd.2xlarge.elasticsearch',
  'm5.xlarge.elasticsearch',
  'r6gd.4xlarge.elasticsearch',
  'r6g.2xlarge.elasticsearch',
  'r5.2xlarge.elasticsearch',
  'm5.12xlarge.elasticsearch',
  'm6g.8xlarge.elasticsearch',
  'm6g.large.elasticsearch',
  'm5.24xlarge.elasticsearch',
  'r6g.4xlarge.elasticsearch',
  't3.large.elasticsearch',
  'r5.4xlarge.elasticsearch',
  'ultrawarm1.large.elasticsearch',
  'r6gd.8xlarge.elasticsearch',
  'r6gd.large.elasticsearch',
  'r6g.xlarge.elasticsearch',
  'r5.xlarge.elasticsearch',
  'r6g.12xlarge.elasticsearch',
  'r5.12xlarge.elasticsearch',
  'm5.2xlarge.elasticsearch',
  'r6gd.xlarge.elasticsearch',
  'r6g.8xlarge.elasticsearch',
  'r6g.large.elasticsearch',
  'r5.24xlarge.elasticsearch',
  'r5.large.elasticsearch',
];

export const ALLOWABLE_SEARCHABLE_INSTANCE_TYPES = elasticsearch_instance_types.concat(
  elasticsearch_instance_types.map((type) => type.replace('elasticsearch', 'search')),
);
